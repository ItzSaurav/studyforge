from flask import Flask, send_file, redirect

app = Flask(__name__, static_folder='static', static_url_path='/static')

@app.route('/')
def index():
    return send_file('static/index.html')

@app.route('/dashboard')
def dashboard():
    return send_file('static/dashboard.html')

if __name__ == '__main__':
    from config import config
    app.run(debug=config.DEBUG, port=config.PORT)
