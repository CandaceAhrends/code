import websockets
import json
import asyncio
from redisManager import RedisManager

redis_manager = RedisManager()
redis_manager.start()

POLYGON_SOCKET_PORT=8082
POLYGON_SOCKET_URL="ws://localhost:8082"
lock = asyncio.Lock()


class MarketSocketReader:
    def __init__(self):
        self.websocket = None
        self.charts = {}
        self.list = []
    
    def set_list(self, list):
        self.list = list

    def get_list(self):
        return self.list

    def get_charts(self):
        return self.charts
    
    async def connect(self):
        self.websocket = await websockets.connect(POLYGON_SOCKET_URL)

    async def start(self):
        await self.connect()
        while True:
             message = await self.websocket.recv()                        
             candleData = json.loads(message)
             global list
             if 'symbol' in candleData:
                async with lock:  # Acquire lock                       
                    symbol = candleData['symbol']    
                    print('socket reader list:', self.list)                    
                    if symbol in self.list:
                        self.charts.setdefault(symbol, []).append(candleData)
                        if len(self.charts[symbol]) > 200:   
                            self.charts[symbol] = self.charts[symbol][-200:]                                      
                        else: 
                            if symbol not in self.list and symbol in self.charts:                            
                                del self.charts[symbol]

    async def stop(self):
        await self.websocket.close()

 