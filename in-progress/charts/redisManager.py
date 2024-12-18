import redis
from threading import Thread, Event


class RedisManager:
    def __init__(self, host="localhost", port=6379, topic="volume"):
        self.host = host
        self.port = port
        self.topic = topic
        self.redis_client = redis.Redis(host=self.host, port=self.port, decode_responses=True)
        self.pubsub = self.redis_client.pubsub()
        self.last_message = None
        self._stop_event = Event()

    def _message_handler(self):
        """Background thread to listen for messages."""
        self.pubsub.subscribe(self.topic)
        print(f"Subscribed to topic: {self.topic}")

        for message in self.pubsub.listen():
            if self._stop_event.is_set():
                break
            if message["type"] == "message":    
                print(f"Received message: {message['data']}")         
                self.last_message = message["data"]

    def start(self):
        """Start the subscription in a background thread."""
        self._stop_event.clear()
        self.listener_thread = Thread(target=self._message_handler, daemon=True)
        self.listener_thread.start()

    def stop(self):
        """Stop the subscription and background thread."""
        self._stop_event.set()
        self.pubsub.close()
        if self.listener_thread.is_alive():
            self.listener_thread.join()

    def get_last_message(self):
        """Retrieve the last message received."""
        return self.last_message


# Example Usage
if __name__ == "__main__":
    redis_manager = RedisManager(topic="gainers")
    redis_manager.start()

    try:
        while True:
            # Wait and display the last message
            last_message = redis_manager.get_last_message()
            
    except KeyboardInterrupt:
        print("Stopping Redis Manager...")
        redis_manager.stop()
