import { config } from 'dotenv';
import axios from 'axios';
import Period from './enums/Period';
import Candle from './models/Candle';
import createMessageChannel from './messages/MessageChannel';

config();

const readMarketPrice = async (): Promise<number> => {
    const response = await axios.get(process.env.PRICES_API);

    const { data } = response;
    const price = data.bitcoin.usd;
    return price
}

const generateCandle = async () => {
    const messageChannel = await createMessageChannel()
    if(!messageChannel) return null;

    while(true){
        const loopTimes = Period.ONE_MINUTE / Period.TEN_SECONDS;
        const candle = new Candle('BTC', new Date());

        console.log('-----------------------------------------------------')
        console.log('Generating new candle');

        for(let i = 0; i < loopTimes; i++){
            const price = await readMarketPrice();
            candle.addValue(price);
            console.log(`Market price ${i+1+'/'+loopTimes}: ${price}`);

            await new Promise(resolve => setTimeout(resolve, Period.TEN_SECONDS));
        }

        candle.closeCandle();
        console.log('Candle closed');

        const candleObj = candle.toSimpleObject();
        console.log(candleObj)

        const candleJson = JSON.stringify(candleObj);
        messageChannel.sendToQueue(process.env.QUEUE_NAME, Buffer.from(candleJson));
        console.log('Candle sent to queue');
    }
}

generateCandle();