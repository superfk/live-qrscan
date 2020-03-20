# -*- coding: utf-8 -*-

import os
import logging
from flask import Flask, render_template, url_for
from flask_socketio import SocketIO, emit

app = Flask(__name__, static_url_path="/static")
app.debug = 'DEBUG' in os.environ

socketio  = SocketIO(app)


@app.route('/')
def hello():
    return render_template('index.html')

@socketio.on('my event')
def handle_my_custom_event(json):
    print('received json: ' + str(json))

if __name__=="__main__":
    socketio.run(app, debug=True)

