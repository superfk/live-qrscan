import sqlite3
import datetime
from db import db
import time


class TeamModel(db.Model):
    __tablename__ = 'progress'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80))
    time_stamp = db.Column(db.DateTime, default=datetime.datetime.utcnow())
    gate = db.Column(db.Integer)
    inout = db.Column(db.String(10))

    def __init__(self, name, time_stamp, gate, inout):
        self.name = name
        self.time_stamp = time_stamp
        self.gate = int(gate)
        self.inout = inout

    def json(self):
        return {'name': self.name, 'time_stamp': self.time_stamp, 'gate':self.gate, 'inout': self.inout}

    @classmethod
    def find_all_team(cls):
        all_teams = [row.name for row in cls.query.group_by(cls.name).all()]
        return all_teams

    @classmethod
    def find_all_gate(cls):
        all_teams = [row.gate for row in cls.query.group_by(cls.gate).all()]
        return all_teams

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
    def find_interval(cls, name=None, gate=None):
        all_teams = cls.find_all_team()
        print(all_teams)
        all_gates = cls.find_all_gate()
        print(all_gates)
        all_status = []
        for t in all_teams:
            for g in all_gates:
                server_data = { 'groupName':t, 'start':'','end':'','intv':'', 'gate':g}
                start = cls.find_checkin(t, g)
                if start:
                    server_data['start'] = start.strftime("%Y-%m-%d %H:%M:%S.%f")
                end = cls.find_checkout(t, g)
                if end:
                    server_data['end'] = end.strftime("%Y-%m-%d %H:%M:%S.%f")
                if start and end:
                    # startT = datetime.datetime.strptime(start,"%Y-%m-%d %H:%M:%D.%f")
                    # endT = datetime.datetime.strptime(end,"%Y-%m-%d %H:%M:%D.%f")
                    difference = end - start
                    server_data['intv'] = difference.total_seconds()
                all_status.append(server_data)
        return all_status

    def save_to_db(self):
        db.session.add(self)
        db.session.commit()

    def delete_from_db(self):
        db.session.delete(self)
        db.session.commit()
