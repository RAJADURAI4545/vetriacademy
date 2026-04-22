# Gunicorn configuration for local production-like testing
# Usage: gunicorn lms_backend.wsgi -c gunicorn.conf.py

import multiprocessing

# Workers: 2 * CPU cores + 1 (recommended by Gunicorn docs)
workers = multiprocessing.cpu_count() * 2 + 1

# Threads per worker (for I/O-bound Django views)
threads = 2

# Worker class: gthread enables threading within each worker
worker_class = "gthread"

# Bind to all interfaces on port 8000
bind = "0.0.0.0:8000"

# Timeout: kill worker if it doesn't respond in 120s
timeout = 120

# Graceful timeout: allow 30s for worker to finish current request on restart
graceful_timeout = 30

# Max requests before worker auto-restarts (prevents memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = "info"

# Preload app to share memory across workers (saves RAM)
preload_app = True

# Keep-alive connections (seconds)
keepalive = 5
