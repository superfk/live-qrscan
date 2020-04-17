import sqlite3
import datetime
from db import db
import time, os

MAX_GATE = os.environ.get('MAX_GATE',7)

def formatTime(dict_data):
    newdict = {}
    newdict['name'] = dict_data.name
    newdict['time_stamp'] = dict_data.time_stamp.strftime("%c")
    newdict['gate'] = dict_data.gate
    newdict['inout'] = dict_data.inout
    return newdict

class TeamModel(db.Model):
    __tablename__ = 'progress'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80))
    time_stamp = db.Column(db.DateTime, default=datetime.datetime.now())
    gate = db.Column(db.Integer)
    inout = db.Column(db.String(10))

    def __init__(self, name, time_stamp, gate, inout):
        self.name = name
        self.time_stamp = time_stamp
        self.gate = gate
        self.inout = inout

    def json(self):
        return {'name': self.name, 'time_stamp': self.time_stamp, 'gate':self.gate, 'inout': self.inout}

    @classmethod
    def find_all_team(cls):
        all_teams = [row.name for row in cls.query.group_by(cls.id,cls.name).all()]
        all_teams = list(set(all_teams))
        return all_teams

    @classmethod
    def find_all_gate(cls):
        all_gates = [row.gate for row in cls.query.group_by(cls.id,cls.gate).all()]
        all_gates = list(set(all_gates))
        return all_gates

    @classmethod
    def find_checkin(cls, name, gate):
        all_data = cls.query.filter_by(name=name,gate=gate, inout='in').all()
        if all_data:
            return all_data[0].time_stamp

    @classmethod
    def find_checkout(cls, name, gate):
        all_data = cls.query.filter_by(name=name,gate=gate, inout='out').all()
        if all_data:
            return all_data[-1].time_stamp

    @classmethod
    def find_records(cls, name=None, gate=None):
        if name == '':
            name = None
        if gate == '':
            gate = None
        if name and gate:
            all_data = cls.query.filter_by(name=name,gate=int(gate)).all()
        elif name:
            all_data = cls.query.filter_by(name=name).all()
        elif gate:
            all_data = cls.query.filter_by(gate=int(gate)).all()
        else:
            all_data = cls.query.all()
         
        return [formatTime(r) for r in all_data]

    @classmethod
    def find_interval(cls):
        all_teams = cls.find_all_team()
        all_gates = cls.find_all_gate()
        all_status = []
        mx_gate = int(MAX_GATE)
        for t in all_teams:
            server_data = {'intv':0, 'groupName':t, 'for_sorting':999999999999.9999, 'done':False, 'gate_status':None}
            total_intv = 0.0
            gate_counter = 0
            gate_status=[]
            for g in range(1,mx_gate+1):
                gate_data = {'gate':g, 'intv':0}
                start = cls.find_checkin(t, g)
                end = cls.find_checkout(t, g)
                if start and end:
                    # startT = datetime.datetime.strptime(start,"%Y-%m-%d %H:%M:%D.%f")
                    # endT = datetime.datetime.strptime(end,"%Y-%m-%d %H:%M:%D.%f")
                    difference = end - start
                    intv = difference.total_seconds()
                    intv = intv if intv >= 0 else 0.0
                    gate_data['intv'] = intv
                    total_intv += intv
                    gate_counter += 1
                gate_status.append(gate_data)
            server_data['gate_status'] = gate_status
            if total_intv > 0.0:
                server_data['intv'] = total_intv
                server_data['for_sorting'] = total_intv
                if gate_counter >= mx_gate:
                    server_data['done'] = True
            else:
                server_data['intv'] = 0.0
            all_status.append(server_data)
        if len(all_status) > 0:
            sortIntvList = sorted(all_status, key=lambda k: k['for_sorting'] )
            return sortIntvList
        else:
            return all_status

    def save_to_db(self):
        db.session.add(self)
        db.session.commit()

    def delete_from_db(self):
        db.session.delete(self)
        db.session.commit()
