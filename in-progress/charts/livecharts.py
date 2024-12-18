import sys
import pandas as pd
from PySide6.QtWidgets import QApplication, QMainWindow, QWidget, QGridLayout, QVBoxLayout, QTabWidget
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from matplotlib.animation import FuncAnimation
import mplfinance as mpf
import matplotlib.pyplot as plt
from PySide6.QtWebEngineWidgets import QWebEngineView
from marketSocketReader import MarketSocketReader
from marketSocketReader import MarketSocketReader
import asyncio
import threading
from redisManager import RedisManager 
import json

plt.style.use('dark_background')

lock = asyncio.Lock() 
reader = MarketSocketReader() 

totalCharts = 4

class CandlestickChart(FigureCanvas):
    def __init__(self, parent=None):
        
        self.fig = Figure()
        super().__init__(self.fig)
        self.fig.set_tight_layout(True)
        self.axes = self.fig.add_subplot(1,1,1)
        self.df = pd.DataFrame(columns=['Date', 'Open', 'High', 'Low', 'Close', 'Volume']) 

    def update_data(self, data):
        self.df = pd.DataFrame(data)
        self.df['time'] = pd.to_datetime(self.df['time'], format="%H:%M")
        self.df.rename(columns={'time': 'Date', 'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'}, inplace=True)
        self.df.set_index('Date', inplace=True)  
        self.axes.clear()    
        #print(len(self.df)) 
        mpf.plot(self.df, type='candle', style='binance', ax=self.axes, mav=(5, 9, 21), mavcolors=['green', 'silver', 'yellow'], show_nontrading=False)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("MarketViz") 
        self.charts = {}
      
        # Create tabs
        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs) 
       
        self.tabs.addTab(self.create_charts_tab(), "Charts")
        self.tabs.addTab(self.createScanner(), "Scanner") 

   

    def animate_chart(self, _):        
        charts = reader.get_charts() 
        for i, key in enumerate(list(charts.keys())[:totalCharts]):             
            self.charts[f'chart{i}'].fig.suptitle(key)
            self.charts[f'chart{i}'].update_data(charts[key]) 
    

    def create_charts_tab(self):
        tab = QWidget()
        layout = QGridLayout(tab)

        for i in range(0, totalCharts):
            chart = CandlestickChart(self)
            layout.addWidget(chart, i, 0)
            self.charts[f'chart{i}'] = chart
            self.charts[f'animation{i}'] = FuncAnimation(chart.fig, self.animate_chart, interval=2000) 


        tab.setLayout(layout)
        return tab  
    
    def createScanner(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)

        # Create a web view
        web_view = QWebEngineView()
        web_view.setUrl("http://localhost:8080")

        # Add the web view to the layout
        layout.addWidget(web_view)
        return tab


def start_event_loop(loop, coro):
    """Start an event loop in a new thread."""
    asyncio.set_event_loop(loop)
    loop.run_until_complete(coro)

async def connect_to_polygon():   
    await reader.start()

async def run_redis_manager():
    redis_manager = RedisManager(topic="volume")
    redis_manager.start()
    try:
        while True:
            await asyncio.sleep(10)
            last_message = redis_manager.get_last_message()
            if last_message:
                last_message = json.loads(last_message)
                tickerList = [item[0] for item in last_message['highestVolume']]
                tickerList = tickerList[:totalCharts]
                async with lock:    
                    print("Updating ticker list...")
                    print(tickerList)
                    reader.set_list(tickerList)                
                

    except KeyboardInterrupt:
        print("Stopping Redis Manager...")
        redis_manager.stop()    

def start_app():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.resize(1100, 1500)
    window.show()
    sys.exit(app.exec())

async def main():   
    loop = asyncio.new_event_loop()      
    redis_loop = asyncio.new_event_loop()
    thread = threading.Thread(target=start_event_loop, args=(loop, connect_to_polygon()))  
    redis_thread = threading.Thread(target=start_event_loop, args=(redis_loop, run_redis_manager()))
    redis_thread.start()
    thread.start()      

    start_app()    
 
    print("All threads have completed.")
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\nExiting...")
   
asyncio.run(main())