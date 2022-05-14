import axios from "axios";
import cheerio from "cheerio";

export async function getExchangeRateEuroFromDollar(): Promise<string> {
    const {data} = await axios.get(`https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=EUR`);
    const $ = cheerio.load(data);
    const euro = parseFloat($('p.result__BigRate-sc-1bsijpp-1.iGrAod').text().split(' ')[0]).toFixed(4);
    return euro;
}

export async function getExchangeRatePoundFromDollar(): Promise<string> {
    const {data} = await axios.get(`https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=GBP`);
    const $ = cheerio.load(data);
    const pound = parseFloat($('p.result__BigRate-sc-1bsijpp-1.iGrAod').text().split(' ')[0]).toFixed(4);
    return pound;
}
