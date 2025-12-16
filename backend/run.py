#!/usr/bin/env python
import asyncio
import signal
import sys

from hypercorn.asyncio import serve
from hypercorn.config import Config

from app.config import settings
from app.main import app


def main():
    """启动应用"""
    config = Config()
    config.bind = [f"{settings.host}:{settings.port}"]
    config.loglevel = settings.log_level.lower()
    config.accesslog = None  # Disable access log
    config.errorlog = "-"

    shutdown_event = asyncio.Event()

    def _signal_handler(*_):
        shutdown_event.set()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    loop.add_signal_handler(signal.SIGTERM, _signal_handler)
    loop.add_signal_handler(signal.SIGINT, _signal_handler)

    try:
        loop.run_until_complete(
            serve(app, config, shutdown_trigger=shutdown_event.wait)
        )
    except KeyboardInterrupt:
        pass
    finally:
        loop.close()


if __name__ == "__main__":
    main()
