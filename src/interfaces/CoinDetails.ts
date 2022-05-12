import Links from "./Links";

export default interface CoinDetail {
    name : string,
    symbol: string,
    img: string,
    price: string,
    BTCValue: string,
    ETHValue: string,
    links: Links
}