import Links from "./Links";
import Price from "./Price";

export default interface CoinDetail {
    name : string,
    symbol: string,
    img: string,
    price: Price,
    BTCValue: string,
    ETHValue: string,
    links: Links
}