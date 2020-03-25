# -*- coding: utf-8 -*-

import os, json
import datetime
import logging
from flask import Flask, render_template, url_for
from flask_socketio import SocketIO, emit
from models.team import TeamModel
from db import *

app = Flask(__name__, static_url_path="/static")

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL','sqlite:///data.db')
# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PROPAGATE_EXCEPTIONS'] = True
app.secret_key = 'shawn'

db = SQLAlchemy(app)
db.init_app(app)
db.create_all()
socketio  = SocketIO(app, manage_session=True)

# @app.before_first_request
# def create_tables():
#     db.create_all()

@app.route('/')
def hello():
    return render_template('index.html')

@socketio.on('check in')
def check_in(data):
    server_data = { 'groupName':data['groupName'],
                    'time_stamp':datetime.datetime.now(),
                    'gate':data['gate'],
                    'inout':data['inout']
                   }
    prog = TeamModel(name=server_data['groupName'],
                     time_stamp=server_data['time_stamp'],
                     gate=server_data['gate'],
                     inout=server_data['inout']) # data = {groupName:gpName, gate:'', inout:'in'};
    prog.save_to_db()

    server_data['time_stamp'] = datetime.datetime.strftime(server_data['time_stamp'],'%c')
    socketio.emit('reply', server_data)

@socketio.on('show status')
def show_status(data):
    prog = TeamModel(name='',
                    time_stamp='',
                    gate=1,
                    inout='') # data = {groupName:gpName, gate:'', inout:'in'};
    ret = prog.find_interval()
    if ret:
        emit('status', {'data':ret}, broadcast=True)

if __name__=="__main__":
    app.run(debug=True)

