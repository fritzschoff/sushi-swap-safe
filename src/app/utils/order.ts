import { Token } from "@sushiswap/sdk";
import { BigNumber, Contract, Signer, utils } from "ethers";
import * as Settlement from '@sushiswap/settlement/deployments/mainnet/Settlement.json'

export class Order {
  maker: Signer;
  fromToken: Token;
  toToken: Token;
  amountIn: BigNumber;
  amountOutMin: BigNumber;
  recipient: string;
  deadline: BigNumber;
  v?: number;
  r?: string;
  s?: string;
  filledAmountIn?: BigNumber;
  canceled?: boolean;

  constructor(
    maker: Signer,
    fromToken: Token,
    toToken: Token,
    amountIn: BigNumber,
    amountOutMin: BigNumber,
    recipient: string,
    deadline = BigNumber.from(Math.floor(Date.now() / 1000 + 24 * 3600)),
    v?: number,
    r?: string,
    s?: string,
    filledAmountIn?: BigNumber,
    canceled?: boolean
  ) {
    this.maker = maker;
    this.fromToken = fromToken;
    this.toToken = toToken;
    this.amountIn = amountIn;
    this.amountOutMin = amountOutMin;
    this.recipient = recipient;
    this.deadline = deadline;
    this.v = v;
    this.r = r;
    this.s = s;
    this.filledAmountIn = filledAmountIn;
    this.canceled = canceled;
  }

  async hash() {
    const settlement = new Contract(Settlement.address, Settlement.abi, this.maker);
    return await settlement.hashOfOrder(
      await this.maker.getAddress(),
      this.fromToken.address,
      this.toToken.address,
      this.amountIn,
      this.amountOutMin,
      this.recipient,
      this.deadline
    );
  }

  async sign() {
    try {
      const hash = await this.hash();
      const signature = await this.maker.signMessage(utils.arrayify(hash));
      return utils.splitSignature(signature);
    } catch (error) {
      console.error(error)
    }
  }

  async toArgs() {
    const { v, r, s } = this.v && this.r && this.s ? { v: this.v, r: this.r, s: this.s } : await this.sign();
    return [
      await this.maker.getAddress(),
      this.fromToken.address,
      this.toToken.address,
      this.amountIn,
      this.amountOutMin,
      this.recipient,
      this.deadline,
      v,
      r,
      s
    ];
  }
}
