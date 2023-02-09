from flask import Flask, render_template, request
from flask_socketio import SocketIO, disconnect, emit, send
from flask_cors import CORS
from threading import Thread
import json
import obswebsocket, obswebsocket.requests, obswebsocket.events, obswebsocket.exceptions

client = None
stream = False
block = 'stop'

def startRecord(mes):
    global stream
    print("Recording started")
    socketio.emit('my response', json.dumps({'type': 'record', 'event': 'start', 'stream': stream}) )

def stopRecord(mes):
    global stream
    print("Recording stopped")
    socketio.emit('my response', json.dumps({'type': 'record', 'event': 'stop', 'stream': stream}) )

def pausedRecord(mes):
    global stream
    print("Recording paused")
    socketio.emit('my response', json.dumps({ 'type': 'record', 'event': 'paused', 'stream': stream }) )

def resumedRecord(mes):
    global stream
    print("Recording resumed")
    socketio.emit('my response', json.dumps({ 'type': 'record', 'event': 'resume', 'stream': stream, 'time': mes.datain}) )

def startStream(mes):
    global stream
    print("Stream started")
    stream = True
    socketio.emit('my response', json.dumps({'type': 'stream', 'event': 'start', 'stream': stream}) )

def stopStream(mes):
    global stream
    print("Stream stopped")
    stream = False
    socketio.emit('my response', json.dumps({'type': 'stream', 'event': 'stop', 'stream': stream}) )

def startMedia(mes):
    print("Media started")
    socketio.emit('media response', json.dumps({ 'type': 'media', 'event': 'start', 'sourceName': mes.getSourceName() }) )

def stopMedia(mes):
    print("Media stopped")
    socketio.emit('media response', json.dumps({ 'type': 'media', 'event': 'stop' }) )

def pausedMedia(mes):
    print("Media paused")
    socketio.emit('media response', json.dumps({ 'type': 'media', 'event': 'paused' }) )

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode='threading', cors_allowed_origins='*')

def registerClientEventsReq(client):
    client.register(startRecord, obswebsocket.events.RecordingStarted)
    client.register(stopRecord, obswebsocket.events.RecordingStopped)
    client.register(pausedRecord, obswebsocket.events.RecordingPaused)
    client.register(resumedRecord, obswebsocket.events.RecordingResumed)
    client.register(startStream, obswebsocket.events.StreamStarted)
    client.register(stopStream, obswebsocket.events.StreamStopped)
    client.register(startMedia, obswebsocket.events.MediaStarted)
    client.register(stopMedia, obswebsocket.events.MediaStopped)
    client.register(pausedMedia, obswebsocket.events.MediaPaused)

try:
    obs = None
    with open('config.json', 'r') as json_file:
        data = json.load(json_file)
        obs = data['obs']
        json_file.close()

    if obs:
        client = obswebsocket.obsws(obs['ip'], obs['port'], obs['password'])
        registerClientEventsReq(client)
        client.connect()

except obswebsocket.exceptions.ConnectionFailure:
    socketio.emit('my response', json.dumps({'type': 'error', 'mes': 'error OBS connection'}), broadcast=True)

@app.route('/reconnect', methods = ['POST'])
def change():
    global client
    ip = request.json['ip']
    port = request.json['port']
    password = request.json['password']

    if client:
        client.disconnect()

    try:
        client = obswebsocket.obsws(ip, int(port), password)
        registerClientEventsReq(client)
        client.connect()

    except obswebsocket.exceptions.ConnectionFailure:
       return json.dumps({'status': 'error', 'description': 'Не удалось переподключиться к OBS. Подождите несколько секунд, иначе проверьте правильность ввода данных.'}, ensure_ascii = False) 

    return json.dumps({'status': 'ok'}, ensure_ascii = False)



@socketio.on('record info')
def handle_record_event(data):
    time = client.call(obswebsocket.requests.GetRecordingStatus()).getRecordTimecode()
    socketio.emit('my response', json.dumps({ 'type': 'return', 'time': time }) )
    # socketio.emit('my response', json.dumps({'type': 'connect', 'stream': streaming, 'recording': recording, 'streamTime': streamTime, 'recordTime': recordTime}) )

@socketio.on('media info')
def handle_media_event(data):
    duration = client.call(obswebsocket.requests.GetMediaDuration(data['sourceName'])).getMediaDuration()
    time = client.call(obswebsocket.requests.GetMediaTime(data['sourceName'])).getTimestamp()
    emit('media response', json.dumps({ 'type': 'media', 'event': 'duration', 'duration': duration, 'time': time }) )

@socketio.on('block event')
def handle_block_event(data):
    global block
    block = data['event']
    socketio.emit('block response', json.dumps({'event': data['event'], 'info': data['info']}))

@socketio.on_error()
def error_handler(e):
    emit('my response', json.dumps({'type': 'error', 'mes': str(e)}), broadcast=True)
    # send(json.dumps({'mes': 'e'}), broadcast=True)

@socketio.on('connect')
def startIO():
    streamTime = ''
    recordTime = ''
    if client:
        streaming = client.call(obswebsocket.requests.GetStreamingStatus()).getStreaming()
        recording = client.call(obswebsocket.requests.GetRecordingStatus()).getIsRecording()
        paused = client.call(obswebsocket.requests.GetRecordingStatus()).getIsRecordingPaused()

        if streaming:
            streamTime = client.call(obswebsocket.requests.GetStreamingStatus()).getStreamTimecode()

        if recording:
            recordTime = client.call(obswebsocket.requests.GetRecordingStatus()).getRecordTimecode()

        socketio.emit('my response', json.dumps({'type': 'connect', 'stream': streaming, 'recording': recording, 'recordPause': paused, 'streamTime': streamTime, 'recordTime': recordTime}) )

        global block
        mediaList = client.call(obswebsocket.requests.GetMediaSourcesList()).getMediaSources()
        if mediaList:
            if mediaList[0]['mediaState'] == 'playing' or mediaList[0]['mediaState'] == 'paused':
                duration = client.call(obswebsocket.requests.GetMediaDuration('video')).getMediaDuration()
                time = client.call(obswebsocket.requests.GetMediaTime('video')).getTimestamp()
                emit('media response', json.dumps({ 'type': 'media', 'event': 'connect', 'state': mediaList[0]['mediaState'], 'time': time, 'duration': duration }) )
        emit('block response', json.dumps({ 'event': block }) )

    else:
        socketio.emit('my response', json.dumps({'type': 'connect', 'error': True}) )


if __name__ == '__main__':
    socketio.run(app)
