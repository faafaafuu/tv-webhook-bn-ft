require('dotenv').config();
const path = require('path');
const events = require('events');
const express = require('express')
const BinanceFuters = require('node-binance-api-ext');
const { parse } = require('path');
const { get } = require('http');

const eventEmitter = new events.EventEmitter()
const port = process.env.PORT || 4040
const host = '127.0.0.1';
const app = express()


const symbol = 'USDT'
const ticker = 'LINKUSDT';
const quantity = 0.1;
let eqo = null;

const binance = BinanceFuters({
  APIKEY: process.env.BINANCE_APIKEY,
  APISECRET: process.env.BINANCE_SECRET,
  useServerTime: true,
  reconnect: true
})

eventEmitter.on('error', (err) => {
  console.error(err);
})


const run = async () => {
  try {
    await binance.useServerTime();

    const balancer = await binance.futures.balance();
    const position_data = await binance.futures.positionRisk();

    const get_balance = (symbol='USDT') => balancer[symbol];
    
    //Cheking open position
    let open_pos = () => {
      let op = position_data.filter(e => e.positionAmt != 0);
      op = op[0]
      if(op) {
        
        return op;
      }

      return console.log('NO OPEN POSTIONS');
    }

    //Position vol + PNL
    let eqo = () => {
      open_pos = open_pos();
      if (!open_pos) return;
      let size = null;

      //LONG
      if (open_pos.positionAmt > 0) {

        return size = parseFloat(open_pos.positionAmt) + parseFloat(open_pos.unRealizedProfit); 
      }
      //SHORT
      if (open_pos.unRealizedProfit < 0) {

        return size = (parseFloat(open_pos.positionAmt) + parseFloat(open_pos.unRealizedProfit));
      }
      if(open_pos.unRealizedProfit > 0) {

        return size = parseFloat(open_pos.positionAmt);
      }

      return size;
    }


    eqo = parseFloat(eqo());
    console.log('eco: ', eqo );

    //Performing processied webhooks
    eventEmitter.on('buy',  () => {
      open_pos()
        if(get_balance("USDT").available > 10) {
            binance.futures.marketBuy(ticker, quantity);
            return console.log('WE DID buy!!!');

        }
    })    

    eventEmitter.on('sell', () => {
        if (eqo) {
            console.info( binance.futures.marketSell(ticker, quantity));
            return console.log('WE DID sell!!!');
        }
    }) 
    eventEmitter.on('close', () => {
      if (eco = 0) console.log("Not yet open positions!");
      if (eqo > 0) {
        binance.futures.marketSell(ticker, eqo);
        return console.log('close long');
      }
      if (eqo < 0) {
        let eqo_positive = Math.abs(eqo);
        binance.futures.marketBuy(ticker, eqo_positive);
        return console.log('close short');
      }
    }) 
  }
  catch(err) {
      console.log(err);
  }
}

//Simple, local POST-imitator
// app.get('/',(req,res) => {
//   res.end(
//     `<div>
//       <form method="POST" action="/">
//         <p><input type="text" name="str"></p>
//         <p><input type="submit" value="SEND"></p>
//       </form>
//     </div>`
//   )
// })

//Proccesing receiced webhooks
app.post('/webhook',(req, res) => { 
  let body = [];
  req.on('error', (err) => {
    console.error(err);
  }).on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    //POST imitator option
    // body = Buffer.concat(body).toString().split('=')[1]
    if(body === 'buy') { 
      eventEmitter.emit('buy'); 
    } 
    
    if(body === 'sell') {
      eventEmitter.emit('sell');
    }
    
    if(body === 'stop') {
      eventEmitter.emit('stop'); 
    }

    if(body === 'close') {
      eventEmitter.emit('close'); 
    }
    console.log(body);
    res.statusCode = 200;
    res.end();
    }
  )
})

app.listen(port, () => {
    console.log(`Its working on: http://${host}/${port}`)
})

run();