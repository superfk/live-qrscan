from flask import Flask, jsonify, request, render_template, url_for
import base64

app = Flask(__name__, static_url_path='/static')

@app.route('/')
def home():
    return render_template('index.html')
    

if __name__ == '__main__':
    app.config['TEMPLATES_AUTO_RELOAD'] = True      
    app.jinja_env.auto_reload = True
    app.run(debug=True)