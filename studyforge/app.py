# Simple local Flask server for StudyForge
# Serves the static files (index.html, dashboard.html) during local dev

from flask import Flask, send_file, redirect

# Point static folder so client assets load without extra config
app = Flask(__name__, static_folder='static', static_url_path='/static')

# Root endpoint sends the landing and login page
@app.route('/')
def index():
    return send_file('static/index.html')

# Dashboard endpoint where authenticated users manage tasks and track XP
@app.route('/dashboard')
def dashboard():
    return send_file('static/dashboard.html')

# Run on configured local port for testing
if __name__ == '__main__':
    from config import config
    app.run(debug=config.DEBUG, port=config.PORT)

