import asyncio
import websockets
import threading
import json
import ssl 
import pandas as pd 
import numpy as np
import mplfinance as mpf
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from datetime import datetime, timedelta
import requests


plt.style.use('dark_background')
df = pd.DataFrame(columns=['Date', 'Open', 'High', 'Low', 'Close', 'Volume'])
 
figs = []
axes = []
for i in range(2):
    fig, (ax, ax_volume) = plt.subplots(2, 1, gridspec_kw={'height_ratios': [3, 1]}, figsize=(10, 6))
    fig.subplots_adjust(hspace=0.1)
    figs.append(fig)
    axes.append((ax, ax_volume)) 
 

charts = {} 
interestedStocks = {}
lock = asyncio.Lock()
 
tape = { "action": "subscribe", "params": "A.*" };
auth_payload = {
        "action": "auth",
        "params": POLYGON_APIKEY
    }

URL =  
 
 
last_checked = datetime.now()   
list = []          


async def process_top():
    global URL  
    global list
    global last_checked
    current_time = datetime.now()
    elapsed_time = current_time - last_checked
    if elapsed_time >= timedelta(seconds=30):
        response = requests.get(URL)
        data = response.json()
        list = data['list']      
        return list
    else:
        return list


ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE
async def connect_to_polygon():   
    
    #async with websockets.connect(POLYGON_SOCKET_URL,ssl=ssl_context) as websocket:
    async with websockets.connect(POLYGON_SOCKET_URL) as websocketPoly:
    #     await websocket.send(json.dumps(auth_payload))
    #     print("Authenticated with Polygon.io")
    #     await websocket.send(json.dumps(tape))
    #     print(f"Subscribed to: {tape['params']}")
     
         global interestedStocks
         global charts 
         while True:
             message = await websocketPoly.recv()            
             #candleData = list(json.loads(message))[0]
             candleData = json.loads(message)
             list = await process_top()
             for data in candleData:             
                async with lock:  # Acquire lock
                    symbol = data['sym'] 
                    if symbol in list:
                        #print('add ' + symbol)
                        charts.setdefault(symbol, []).append(data)     
                    
             await asyncio.sleep(1)    

   
              
   
def create_ax(index):
    global charts 
    global axes
    
    df = pd.DataFrame(charts[index])
    df['t'] = pd.to_datetime(df['t'], unit='ms')
    df.rename(columns={'t': 'Date', 'o': 'Open', 'h': 'High', 'l': 'Low', 'c': 'Close', 'v': 'Volume'}, inplace=True)
    ax, ax_volume = axes[index]
    print(ax)
    print(df)
    #df_window = df[-20:].copy()           
    df.set_index('Date', inplace=True)          
    ax.clear()
    ax_volume.clear()
    mpf.plot(
        df, 
        type='candle', 
        style='charles', 
        ax=ax, 
        mav=(5, 9, 21),
        mavcolors=['green', 'blue', 'yellow'],
        volume=ax_volume, 
        show_nontrading=False
    )

async def charts_task():    
    print('start charts')   
     
    def update(frame): 
        global figs
        for index, key in enumerate(charts): 
            fig = figs[index]
            fig.suptitle(key)
            print(f'chart {key}')           
            create_ax(index)
            

    await asyncio.sleep(10)
    global figs
  
    for fig in figs:
        FuncAnimation(fig, update, interval=2000) 

    plt.show()
 

def start_event_loop(loop, coro):
    """Start an event loop in a new thread."""
    asyncio.set_event_loop(loop)
    loop.run_until_complete(coro)

 
async def main():
    
    loop = asyncio.new_event_loop()      
    thread2 = threading.Thread(target=start_event_loop, args=(loop, connect_to_polygon()))     
    thread2.start()    
    await charts_task()
    thread2.join()    
 
    print("All threads have completed.")
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\nExiting...")
   
asyncio.run(main())


