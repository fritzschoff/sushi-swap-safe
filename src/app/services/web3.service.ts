import { Injectable } from '@angular/core';
import { tokens } from 'src/assets/tokens';
import { BigNumber, constants, Contract, providers, utils } from 'ethers';
import { WETH } from '@sushiswap/sdk';
import { sushiSwapRouter } from '../sushiswap';
import { address as settlementAddress } from '@sushiswap/settlement/deployments/mainnet/Settlement.json';
import SafeAppsSDK from '@gnosis.pm/safe-apps-sdk';
import { mainnetProvider } from 'secret';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class Web3Service {
  public infuraProvider = new providers.JsonRpcProvider(mainnetProvider)
  public web3Provider: providers.Web3Provider;
  public address: string;
  public sdk: SafeAppsSDK;
  private ETH = {
    name: "Ethereum",
    address: constants.AddressZero,
    decimals: 18,
    symbol: "ETH",
    logoURI: "https://lite.sushiswap.fi/images/tokens/ETH.png",
    balance: BigNumber.from(0)
  };

  public erc20Contract = (token: typeof tokens[0]) => new Contract(token.address, [
    'function allowance(address owner, address spender) public view returns (uint256)',
    'function approve(address spender, uint256 amount) public returns (bool)',
    'function balanceOf(address account) public view returns (uint256)'
  ]);

  constructor() {
    this.sdk = new SafeAppsSDK();
    this.sdk.getSafeInfo().then(info => this.address = info.safeAddress)
    if (!environment.production) {
      if ((window as any).ethereum.isMetaMask) {
        (window as any).ethereum.request({ method: 'eth_requestAccounts' }).then(() => {
          this.web3Provider = new providers.Web3Provider((window as any).ethereum);
          this.web3Provider.getSigner().getAddress().then(value => this.address = value)
        })
      }
    }
  }

  public async hasAllowance(token: typeof tokens[0], isRouter: boolean) {
    return this.erc20Contract(token).connect(this.infuraProvider).allowance(this.address, isRouter ? sushiSwapRouter : settlementAddress)
  }

  public approve(token: typeof tokens[0]) {
    return this.erc20Contract(token)
  }

  public swapTokens(tokenOne: typeof tokens[0], tokenTwo: typeof tokens[0], tokenAmount: string | number) {
    const sushiSwapRouterContract = new utils.Interface([`function swapExactTokensForTokens
    (uint amountIn,uint amountOutMin, address[] calldata path,address to,uint deadline)
     external returns (uint[] memory amounts)`,
      `function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
      external payable returns (uint[] memory amounts)`,
      `function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
      external returns (uint[] memory amounts)`,
      `function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
      external returns (uint[] memory amounts)`
    ]);
    const deadline = new Date().getTime() + 300;
    if (this.isETH(tokenOne)) {
      console.info('first token was eth')
      return sushiSwapRouterContract.encodeFunctionData('swapExactETHForTokens', [1, [WETH[1].address, tokenTwo.address],
        this.address, deadline])
    }
    else if (this.isETH(tokenTwo)) {
      console.info('first token was a token and second token was eth')
      return sushiSwapRouterContract.encodeFunctionData('swapExactTokensForETH', [
        utils.parseUnits(tokenAmount.toString(), tokenOne.decimals), 1, [tokenOne.address, WETH[1].address], this.address, deadline
      ])
    }
    else if (!this.isETH(tokenOne) && !this.isETH(tokenTwo)) {
      console.info('both tokens were tokens')
      if (this.isWETH(tokenOne) || this.isWETH(tokenTwo)) {
        return sushiSwapRouterContract.encodeFunctionData('swapExactTokensForTokens',
          [utils.parseUnits(tokenAmount.toString(), tokenOne.decimals), 1, [tokenOne.address, tokenTwo.address], this.address, deadline])
      }
      return sushiSwapRouterContract.encodeFunctionData('swapExactTokensForTokens',
        [utils.parseUnits(tokenAmount.toString(), tokenOne.decimals), 1, [tokenOne.address, WETH[1].address, tokenTwo.address],
        this.address, deadline])
    }
  }

  public isETH(token: typeof tokens[0]): boolean {
    return token?.address.toLowerCase() === this.ETH.address.toLowerCase();
  }

  public isWETH = (token?: typeof tokens[0]) => token?.address.toLowerCase() === WETH[1].address.toLowerCase();
}
