import Price from "./Price";

export default interface Coin {
    "id": string,
    "rank": string,
    "img":  string,
    "name":  string,
    "symbol": string,
    "price": Price,
    "24h": string,
    "7d" : string,
    "supply": string,
    "marketcap": Price
}