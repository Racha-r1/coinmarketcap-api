import express, {Application, Request, Response} from 'express';
import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import cors from 'cors';
import Coin from './interfaces/Coin';
import CoinDetail from './interfaces/CoinDetails';
import ExchangeData from './interfaces/ExchangeData';
import NftData from './interfaces/NftData';
import {getExchangeRateEuroFromDollar, getExchangeRatePoundFromDollar} from './util';

const app: Application = express();
const port: number | string = process.env.PORT || 8080;

const baseURL = "https://coinmarketcap.com/";

app.use(cors());

// GET coins route (100 per page)
app.get("/coins/:page", async(req: Request,res: Response) => {
    const pageNum: number = parseInt(req.params.page);
    const p = pageNum !== NaN ? pageNum : 1;
    const browser = await puppeteer.launch({'args' : [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ]});
    const pound = await getExchangeRatePoundFromDollar();
    const euro = await getExchangeRateEuroFromDollar();
    const page = await browser.newPage();
    await page.goto(`${baseURL}?page=${p}`);
    await page.evaluate(async () => {
        await new Promise<void>((resolve, reject) => {
            let totalHeight = 0;
            let distance = 1200;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
    const results = await page.evaluate(() => {
        const results: Coin[] = [];
        const rows = Array.from(document.querySelectorAll("tbody > tr:not([class])"));

        rows.forEach(row => {
            const children = Array.from(row.querySelectorAll("td"));
            const lowHigh: string = children[4].innerText;
            const sevenDay: string = children[5].innerText;
            const rank: string = children[1].innerText;
            const img: string = children[2].querySelector("img").src;
            const id: string = children[2].querySelector("a").href.slice(37,children[2].querySelector("a").href.length-1);
            const name: string = Array.from(children[2].querySelectorAll("p"))[0].innerText;
            const symbol = Array.from(children[2].querySelectorAll("p"))[1].innerText;
            const usdPrice: string = children[3].querySelector("a").innerText;
            const sign: string = children[4].querySelector("span > span").classList.contains("icon-Caret-down") ? "-" : "+";
            const sign2: string = children[5].querySelector("span > span").classList.contains("icon-Caret-down") ? "-" : "+";
            const marketCapElement = Array.from(children[6].querySelectorAll("p > span"))[1] as HTMLElement;
            const supplyElement = children[8].querySelector("div > div > p") as HTMLElement;
            const usdMarketcap: string = marketCapElement.innerText;
            const supply: string = supplyElement.innerText;
            let coinData: Coin = {
                "id": id,
                "rank": rank,
                "img" :  img,
                "name":  name,
                "symbol": symbol,
                "price": {
                    "usd": '$' + parseFloat(usdPrice.slice(1).replace(/,/g,'')).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                },
                "24h": sign + lowHigh,
                "7d" : sign2 + sevenDay,
                "supply": supply,
                "marketcap": {
                    "usd": usdMarketcap,
                }
            }
            results.push(coinData); 
        });
        return results;
    });
    await browser.close();
    const filtered = [...new Set(results.map(x => JSON.stringify(x)))].map(x => JSON.parse(x));
    for (let index in filtered){
        filtered[index].price.gbp = '£' + (parseFloat(filtered[index].price.usd.slice(1).replace(/,/g,'')) * parseFloat(pound)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        filtered[index].price.eur = '€' + (parseFloat(filtered[index].price.usd.slice(1).replace(/,/g,'')) * parseFloat(euro)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        filtered[index].marketcap.gbp = '£' + (parseFloat(filtered[index].marketcap.usd.slice(1).replace(/,/g,'')) * parseFloat(pound)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        filtered[index].marketcap.eur = '€' + (parseFloat(filtered[index].marketcap.usd.slice(1).replace(/,/g,'')) * parseFloat(euro)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    res.send(filtered);
});

// GET coin details by id
app.get("/coins/detail/:id", async(req,res) => {
    const list_items = [];
    const values = [];
    const id = req.params.id;
    const {data} = await axios.get(`${baseURL}currencies/${id}`);
    const $ = cheerio.load(data);
    $("ul.content > li").each((i, el) => list_items.push(($(el).html())));
    $("p.esfl2f-0.kqzSsi").each((i, el) => values.push(($(el).contents().first().text())));
    const name =  $("div.sc-16r8icm-0.gpRPnR.nameHeader > h2").contents().first().text();
    const symbol = $("div.sc-16r8icm-0.gpRPnR.nameHeader > h2 > small").text();
    const img = $("div.sc-16r8icm-0.gpRPnR.nameHeader > img").attr("src");
    const usdPrice = $("div.priceValue").text();
    const BTCValue = values[0];
    const ETHValue = values[1];
    const pound = await getExchangeRatePoundFromDollar();
    const euro = await getExchangeRateEuroFromDollar();
    const links = {
        "project_url": $(list_items[0]).attr("href"),
        "source_code": $(list_items[4]).attr("href"),
        "whitepaper": $(list_items[5]).attr("href")
    }
    const details: CoinDetail = {
        "name" : name,
        "symbol": symbol,
        "img" : img,
        "price": {
            "usd": '$' + parseFloat(usdPrice.slice(1).replace(/,/g,'')).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            "gbp": '£' + (parseFloat(usdPrice.slice(1).replace(/,/g,'')) * parseFloat(pound)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            "eur": '€' + (parseFloat(usdPrice.slice(1).replace(/,/g,'')) * parseFloat(euro)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
         
        },
        "BTCValue": BTCValue,
        "ETHValue": ETHValue,
        "links" : links
    }
    res.send(details);
});

// GET the top ranking exchanges 
app.get("/exchanges", async(req,res) => {
    const browser = await puppeteer.launch({'args' : [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]});
    const page = await browser.newPage();
    await page.goto(`${baseURL}rankings/exchanges`);
    await page.evaluate(async () => {
        await new Promise<void>((resolve, reject) => {
            let totalHeight = 0;
            let distance = 1200;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
    const results = await page.evaluate(() => {
        const results: ExchangeData[] = [];
        const rows = Array.from(document.querySelectorAll("tbody > tr:not([class])"));
        rows.forEach(row => {
            const children = Array.from(row.querySelectorAll("td"));
            const rank = children[0].innerText;
            const img = children[1].querySelector("img").src;
            const pname = children[1].querySelector("p.q7nmo0-0.bogImm") as HTMLParagraphElement;
            const name = pname.innerText;
            const exchange_score = children[2].innerText;
            const volume_24h = children[3].innerText.split("\n")[0];
            const avg_liquidity = children[4].innerText;
            const coins = children[7].innerText;
            const id = children[1].querySelector("a").href.slice(36,children[1].querySelector("a").href.length-1);
            let exchangeData: ExchangeData = {
                "id": id,
                "rank": rank,
                "img" :  img,
                "name":  name,
                "exchange_score": exchange_score,
                "volume_24h": volume_24h,
                "avg_liquidity": avg_liquidity,
                "listed_coins" : coins,
            }
            results.push(exchangeData);  
        });
        return results;
    });
    await browser.close();
    const filtered = [...new Set(results.map(x => JSON.stringify(x)))].map(x => JSON.parse(x));
    res.send(filtered);
});

// GET TOP NFT Projects
app.get("/nft/:page", async(req,res) => {
    const pageNum: number = parseInt(req.params.page);
    const p = pageNum !== NaN ? pageNum : 1;
    const browser = await puppeteer.launch({'args' : [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]})
    const page = await browser.newPage();
    await page.goto(`${baseURL}nft/collections?page=${p}`);
    await page.evaluate(async () => {
        await new Promise<void>((resolve, reject) => {
            let totalHeight = 0;
            let distance = 1200;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
    const results = await page.evaluate(() => {
        const results: NftData[] = [];
        const rows = Array.from(document.querySelectorAll("tbody > tr:not([class])"));
        rows.forEach(row => {
            const children = Array.from(row.querySelectorAll("td"));
            const rank = children[0].innerText;
            const img = children[1].querySelector("img").src;
            const name = children[1].querySelector("span").innerText;
            const volume_24h = children[2].querySelector("div").innerText.split("\n")[0];
            const estimated_marketcap = children[3].innerText.split("\n")[0];
            const avg_price = children[5].innerText.split("\n")[0];
            const amount_of_owners = children[7].innerText.replace(",", "");
            let nftData: NftData = {
                "rank": rank,
                "img" :  img,
                "name":  name,
                "volume_24h": volume_24h,
                "estimated_marketcap": estimated_marketcap,
                "avg_price": avg_price,
                "amount_of_owners" : amount_of_owners,
            }
            results.push(nftData);  
        });
        return results;
    });
    await browser.close();
    const filtered = [...new Set(results.map(x => JSON.stringify(x)))].map(x => JSON.parse(x));
    res.send(filtered);
});

app.listen(port, () => {
    console.log(`Example webserver listening on port ${port}`);
});