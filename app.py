# -*- coding: utf-8 -*-

import os, json
import datetime
import logging
from flask import Flask, render_template, url_for, json
from werkzeug.exceptions import HTTPException
from flask_socketio import SocketIO, emit
from models.team import TeamModel
from db import db

app = Flask(__name__, static_url_path="/static")

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL','sqlite:///data.db')
# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PROPAGATE_EXCEPTIONS'] = True
app.secret_key = 'shawn'

db.init_app(app)
socketio  = SocketIO(app, manage_session=True)

# create table when 
with app.app_context():
    # your code here
    db.create_all()

@app.route('/')
def hello():
    return render_template('index.html')

@app.errorhandler(HTTPException)
def handle_exception(e):
    """Return JSON instead of HTML for HTTP errors."""
    # start with the correct headers and status code from the error
    response = e.get_response()
    # replace the body with JSON
    response.data = json.dumps({
        "code": e.code,
        "name": e.name,
        "description": e.description,
    })
    response.content_type = "application/json"
    return response

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
    ret = prog.find_interval()
    if ret:
        emit('status', {'data':ret}, broadcast=True)


@socketio.on('show status')
def show_status(data):
    prog = TeamModel(name='',
                    time_stamp='',
                    gate=1,
                    inout='') # data = {groupName:gpName, gate:'', inout:'in'};
    ret = prog.find_interval()
    if ret:
        emit('status', {'data':ret})

@socketio.on('show records')
def show_records(data):
    prog = TeamModel(name=data['group'],
                    time_stamp='',
                    gate=data['gate'],
                    inout='') # data = {groupName:gpName, gate:'', inout:'in'};
    ret = prog.find_records(name=data['group'], gate=data['gate'])
    if ret:
        emit('allRecords', {'data':ret})

@socketio.on('delete all records')
def delete_all_records():
    prog = TeamModel(name='',
                    time_stamp='',
                    gate=1,
                    inout='') # data = {groupName:gpName, gate:'', inout:'in'};
    ret = prog.delete_from_db()
    if ret:
        emit('deletedOK', {'data':'records deleted'})
    else:
        emit('deletedOK', {'data':'delete failed'})

if __name__=="__main__":
    app.run(debug=True)
    # socketio.run(app,policy_server=False, transports='websocket, xhr-polling, xhr-multipart')

