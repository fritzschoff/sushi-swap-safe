import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChainId, Fetcher, Route, Token, WETH } from '@sushiswap/sdk';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Web3Service } from 'src/app/services/web3.service';
import { sushiSwapRouter } from 'src/app/sushiswap';
import { BigNumber, constants, utils } from 'ethers'
import { FormControl, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'market-order',
  templateUrl: 'market-order.component.html',
  styleUrls: ['./market-order.component.scss']
})
export class MarketOrder implements OnInit {

  form = new FormGroup({
    tokenOne: new FormControl(),
    tokenOneAmount: new FormControl(),
    tokenTwo: new FormControl()
  });

  public needApproveToken: boolean;

  public weth = new Token(ChainId.MAINNET, WETH[1].address, 18, WETH[1].symbol);

  public pendingTx = new BehaviorSubject(false);

  public pairData: { tokens: Record<string, string> };

  public cannotFindPool: boolean;

  private sub: Subscription;

  constructor(private web3: Web3Service, private snackbar: MatSnackBar, private cdr: ChangeDetectorRef) { }

  async ngOnInit() {
    this.sub = this.form.valueChanges.subscribe(value => {
      if (typeof value?.tokenOne?.address === 'string' && value.tokenOneAmount > 0
        && !this.web3.isETH(value?.tokenOne)) {
        this.web3.hasAllowance(value.tokenOne, true)
          .then((allowance: BigNumber) => {
            this.needApproveToken = !allowance.gt(BigNumber.from('0'))
            this.cdr.markForCheck();
          })
      }
    })
    this.sub.add(this.form.valueChanges.subscribe(async data => {
      if (data.tokenOne?.address && data.tokenTwo?.address) {
        this.pairData = await this.calculateTrade();
        this.cdr.markForCheck();
      }
    }));
  }

  resetForm() {
    this.form.reset();
    this.pairData = {} as any;
  }

  async setMaxBalance() {
    try {
      if (this.web3.isETH(this.value.tokenOne)) {
        const balance = await this.web3.infuraProvider.getBalance(this.web3.address);
        this.form.get('tokenOneAmount').setValue(utils.formatEther(balance))
      } else {
        const tokenBlance = await this.web3.erc20Contract(this.value.tokenOne)
          .connect(this.web3.infuraProvider).balanceOf(this.web3.address)
        this.form.get('tokenOneAmount').setValue(utils.formatUnits(tokenBlance, this.value.tokenOne.decimals))
      }
    } catch (error) {
      console.error(error);
      this.snackbar.open('Could not find balance of token', '', { duration: 3000 })
    }
  }

  async approveToken() {
    try {
      this.pendingTx.next(true)
      const tx = environment.production
        ? await this.web3.sdk.txs.send({
          txs: [{
            to: this.value.tokenOne.address,
            data: this.web3.approve(this.value.tokenOne).interface.encodeFunctionData('approve', [sushiSwapRouter, constants.MaxUint256]),
            value: '0'
          }]
        })
        : await this.web3.approve(this.value.tokenOne)
          .connect(this.web3.web3Provider.getSigner())
          .approve(sushiSwapRouter, constants.MaxUint256);
      tx.wait(1).finally(() => {
        this.pendingTx.next(false);
        this.needApproveToken = false;
      })
    } catch (error) {
      console.error(error);
      this.pendingTx.next(false);
      this.needApproveToken = true;
      this.snackbar.open('Did you rejected the transaction?', '', { duration: 3000 })
    }
  }

  async swap() {
    try {
      this.pendingTx.next(true)
      const data = this.web3.swapTokens(this.value.tokenOne, this.value.tokenTwo, this.value.tokenOneAmount);
      let tx;
      if (this.web3.isETH(this.value.tokenOne)) {
        tx = environment.production
          ? await this.web3.sdk.txs.send({ txs: [{ to: sushiSwapRouter, data, value: this.value.tokenOneAmount.toString() }] })
          : await this.web3.web3Provider.getSigner().
            sendTransaction({ to: sushiSwapRouter, data, value: utils.parseEther(this.value.tokenOneAmount.toString()) })
      } else {
        tx = environment.production
          ? await this.web3.sdk.txs.send({
            txs: [{
              to: sushiSwapRouter,
              data,
              value: '0'
            }]
          })
          : await this.web3.web3Provider.getSigner().sendTransaction({
            to: sushiSwapRouter,
            data
          })
      }
      tx.wait(1).then(() => {
        this.pendingTx.next(false);
        this.needApproveToken = false;
      })
    }
    catch (error) {
      this.pendingTx.next(false);
      this.needApproveToken = false;
    }
  }

  get value() {
    return this.form.value
  }

  async calculateTrade() {
    try {
      this.cannotFindPool = false;
      if (this.web3.isETH(this.value.tokenOne)) {
        return this.firstTokenIsWeth()
      } else if (this.web3.isETH(this.value.tokenTwo)) {
        return this.secondTokenIsWeth()
      } else if (this.web3.isWETH(this.value.tokenOne)) {
        return this.firstTokenIsWeth()
      } else if (this.web3.isWETH(this.value.tokenTwo)) {
        return this.secondTokenIsWeth();
      } else {
        const tokenA = new Token(ChainId.MAINNET, this.value.tokenOne.address, this.value.tokenOne.decimals, this.value.tokenOne.symbol);
        const tokenB = new Token(ChainId.MAINNET, this.value.tokenTwo.address, this.value.tokenTwo.decimals, this.value.tokenTwo.symbol);
        const pair1 = await Fetcher.fetchPairData(tokenA, this.weth, this.web3.web3Provider);
        const pair2 = await Fetcher.fetchPairData(tokenB, this.weth, this.web3.web3Provider);
        const price0 = new Route([pair1], tokenA).midPrice.toSignificant();
        const price1 = new Route([pair2], tokenB).midPrice.toSignificant();
        return {
          tokens: {
            [tokenA.symbol]: price0,
            [tokenB.symbol]: price1
          }
        }
      }
    } catch (error) {
      console.error(error)
      this.cannotFindPool = true;
    }
  }

  private async firstTokenIsWeth() {
    try {
      const tokenA = this.weth
      const tokenB = new Token(ChainId.MAINNET, this.value.tokenTwo.address, this.value.tokenTwo.decimals, this.value.tokenTwo.symbol);
      const pair = await Fetcher.fetchPairData(tokenA, tokenB, this.web3.web3Provider);
      const price0 = new Route([pair], tokenB).midPrice.toSignificant();
      return {
        tokens: {
          [tokenB.symbol]: price0
        }
      }
    } catch (error) {
      console.error(error)
      this.cannotFindPool = true;
    }
  }

  private async secondTokenIsWeth() {
    try {
      const tokenA = new Token(ChainId.MAINNET, this.value.tokenOne.address, this.value.tokenOne.decimals, this.value.tokenOne.symbol);
      const tokenB = this.weth;
      const pair = await Fetcher.fetchPairData(tokenA, tokenB, this.web3.web3Provider);
      const price0 = new Route([pair], tokenB).midPrice.invert().toSignificant();
      return {
        tokens: {
          [tokenA.symbol]: price0
        }
      }
    }
    catch (error) {
      console.error(error)
      this.cannotFindPool = true;
    }
  }
}
