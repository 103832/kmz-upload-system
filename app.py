import json, os, uuid, sys
try:
    from flask import Flask, request, jsonify, session, send_from_directory
except ImportError:
    print("Flask not installed. Run: py -m pip install flask")
    sys.exit(1)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'baha-secret-key-2024')
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024
BASE = os.path.dirname(os.path.abspath(__file__))
USERS = os.path.join(BASE, 'users.json')
CONFIG = os.path.join(BASE, 'config.json')
UPLOADS = os.path.join(BASE, 'uploads')
PUBLIC = os.path.join(BASE, 'public')
os.makedirs(UPLOADS, exist_ok=True)

def rd(p):
    try: return json.load(open(p, 'r', encoding='utf-8'))
    except: return [] if 'users' in p else {}

def wr(p, d):
    with open(p, 'w', encoding='utf-8') as f: json.dump(d, f, ensure_ascii=False, indent=2)

def load_cfg():
    try: return json.load(open(CONFIG, 'r', encoding='utf-8'))
    except: return {"folders":[{"id":1,"name":"بيانات KMZ","parentId":null}],"kmzFiles":[],"appName":"BAHA","totalLogins":0,"totalAccesses":0,"siteInfo":{"developer":"","contact":"","inquiry":""}}

def logged_in(): return 'user' in session

def is_admin(): return 'user' in session and session['user'].get('role') == 'admin'

@app.route('/api/login', methods=['POST'])
def login():
    d = request.get_json()
    u, p = d.get('username', ''), d.get('password', '')
    for x in rd(USERS):
        if x['username'] == u and x['password'] == p:
            session['user'] = {'id': x['id'], 'username': x['username'], 'role': x['role'], 'name': x['name']}
            cfg = load_cfg()
            cfg['totalLogins'] = cfg.get('totalLogins', 0) + 1
            wr(CONFIG, cfg)
            return jsonify({'ok': True, 'role': x['role'], 'name': x['name']})
    return jsonify({'ok': False, 'msg': 'خطأ في الاسم أو كلمة السر'})

@app.route('/api/logout', methods=['POST'])
def logout(): session.clear(); return jsonify({'ok': True})

@app.route('/api/session')
def sess():
    if 'user' in session: return jsonify({'in': True, 'user': session['user']})
    return jsonify({'in': False})

@app.route('/api/stats')
def stats():
    if not logged_in(): return jsonify({'error': 'غير مصرح'}), 403
    cfg = load_cfg()
    users = rd(USERS)
    files = cfg.get('kmzFiles', [])
    folders = cfg.get('folders', [])
    return jsonify({
        'totalUsers': len(users),
        'totalLogins': cfg.get('totalLogins', 0),
        'totalFiles': len(files),
        'totalFolders': len(folders),
        'totalAccesses': cfg.get('totalAccesses', 0)
    })

@app.route('/api/site-info')
def site_info():
    return jsonify(load_cfg().get('siteInfo', {}))

@app.route('/api/access-file/<int:fid>', methods=['POST'])
def access_file(fid):
    if not logged_in(): return jsonify({'error': 'غير مصرح'}), 403
    cfg = load_cfg()
    cfg['totalAccesses'] = cfg.get('totalAccesses', 0) + 1
    wr(CONFIG, cfg)
    return jsonify({'ok': True})

@app.route('/api/folders', methods=['GET', 'POST'])
def folders():
    if request.method == 'GET':
        if not logged_in(): return jsonify({'error': 'غير مصرح'}), 403
        cfg = load_cfg()
        return jsonify(cfg.get('folders', []))
    if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
    d = request.get_json()
    nm, pid = d.get('name', '').strip(), d.get('parentId', 1)
    if not nm: return jsonify({'error': 'أدخل اسم المجلد'}), 400
    cfg = load_cfg()
    fls = cfg.get('folders', [])
    fls.append({'id': max((x['id'] for x in fls), default=0) + 1, 'name': nm, 'parentId': pid})
    cfg['folders'] = fls; wr(CONFIG, cfg)
    return jsonify({'ok': True})

@app.route('/api/folders/<int:fid>', methods=['DELETE'])
def del_folder(fid):
    if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
    cfg = load_cfg()
    fls = cfg.get('folders', [])
    if fid == 1: return jsonify({'error': 'لا يمكن حذف المجلد الرئيسي'}), 400
    fls = [x for x in fls if x['id'] != fid and x.get('parentId') != fid]
    cfg['folders'] = fls
    cfg['kmzFiles'] = [x for x in cfg.get('kmzFiles', []) if x.get('folderId') != fid]
    for f in cfg['kmzFiles']:
        if os.path.exists(f.get('path', '')): os.remove(f['path'])
    cfg['kmzFiles'] = [x for x in cfg['kmzFiles'] if x.get('folderId') != fid]
    wr(CONFIG, cfg)
    return jsonify({'ok': True})

@app.route('/api/kmz-files')
def kmz_files():
    if not logged_in(): return jsonify({'error': 'غير مصرح'}), 403
    fid = request.args.get('folderId', type=int)
    cfg = load_cfg()
    files = cfg.get('kmzFiles', [])
    if fid: files = [f for f in files if f.get('folderId') == fid]
    for f in files:
        if f.get('path'): f['url'] = f'/uploads/{os.path.basename(f["path"])}'
    return jsonify(files)

@app.route('/api/upload', methods=['POST'])
def upload():
    if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
    folder_id = request.form.get('folderId', 1, type=int)
    uploaded_files = request.files.getlist('files')
    if not uploaded_files or uploaded_files[0].filename == '':
        return jsonify({'error': 'اختر ملفاً واحداً على الأقل'}), 400
    cfg = load_cfg(); files = cfg.get('kmzFiles', [])
    results = []
    for f in uploaded_files:
        if f.filename == '': continue
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in ['.kmz', '.kml']: continue
        nm = f.filename.replace(ext, '')
        unique = f'{uuid.uuid4().hex}{ext}'; path = os.path.join(UPLOADS, unique); f.save(path)
        files.append({
            'id': max((x['id'] for x in files), default=0) + 1,
            'name': nm, 'description': '', 'path': path,
            'fileName': f.filename, 'folderId': folder_id
        })
        results.append(f.filename)
    cfg['kmzFiles'] = files; wr(CONFIG, cfg)
    return jsonify({'ok': True, 'count': len(results), 'files': results})

@app.route('/api/delete-file/<int:fid>', methods=['DELETE'])
def del_file(fid):
    if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
    cfg = load_cfg(); files = cfg.get('kmzFiles', [])
    f = next((x for x in files if x['id'] == fid), None)
    if not f: return jsonify({'error': 'غير موجود'}), 404
    if os.path.exists(f.get('path', '')): os.remove(f['path'])
    cfg['kmzFiles'] = [x for x in files if x['id'] != fid]; wr(CONFIG, cfg)
    return jsonify({'ok': True})

@app.route('/api/users', methods=['GET', 'POST'])
def users():
    if request.method == 'GET':
        if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
        return jsonify([{'id': x['id'], 'username': x['username'], 'role': x['role'], 'name': x['name']} for x in rd(USERS)])
    if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
    d = request.get_json()
    un, pw, nm, rl = d.get('username', '').strip(), d.get('password', ''), d.get('name', '').strip(), d.get('role', 'user')
    if not un or not pw or not nm: return jsonify({'error': 'املأ جميع الحقول'}), 400
    users = rd(USERS)
    if any(x['username'] == un for x in users): return jsonify({'error': 'المستخدم موجود مسبقاً'}), 400
    users.append({'id': max((x['id'] for x in users), default=0) + 1, 'username': un, 'password': pw, 'name': nm, 'role': rl})
    wr(USERS, users)
    return jsonify({'ok': True})

@app.route('/api/users/<int:uid>', methods=['PUT', 'DELETE'])
def user_by_id(uid):
    if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
    users = rd(USERS); u = next((x for x in users if x['id'] == uid), None)
    if not u: return jsonify({'error': 'غير موجود'}), 404
    if request.method == 'PUT':
        d = request.get_json()
        if d.get('name'): u['name'] = d['name'].strip()
        if d.get('role'): u['role'] = d['role']
        if d.get('password'): u['password'] = d['password']
        wr(USERS, users); return jsonify({'ok': True})
    if u['username'] == 'admin': return jsonify({'error': 'لا يمكن حذف admin'}), 400
    wr(USERS, [x for x in users if x['id'] != uid]); return jsonify({'ok': True})

@app.route('/api/config', methods=['GET', 'PUT'])
def config():
    if request.method == 'GET':
        if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
        return jsonify(load_cfg())
    if not is_admin(): return jsonify({'error': 'غير مصرح'}), 403
    d = request.get_json(); c = load_cfg()
    if 'kmzFiles' in d: c['kmzFiles'] = d['kmzFiles']
    if 'appName' in d: c['appName'] = d['appName']
    if 'siteInfo' in d: c['siteInfo'] = d['siteInfo']
    if 'folders' in d: c['folders'] = d['folders']
    wr(CONFIG, c); return jsonify({'ok': True})

@app.route('/uploads/<fn>')
def uploaded(fn): return send_from_directory(UPLOADS, fn)

@app.route('/')
def idx(): return send_from_directory(PUBLIC, 'index.html')

@app.route('/<path:p>')
def stat(p):
    fp = os.path.join(PUBLIC, p)
    if os.path.isfile(fp): return send_from_directory(PUBLIC, p)
    return send_from_directory(PUBLIC, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 2525))
    import socket
    ip = socket.gethostbyname(socket.gethostname())
    print('+' + '-'*35 + '+')
    print('|  BAHA server is running           |')
    print('|  PC:      http://localhost:' + str(port) + '    |')
    print('|  Mobile:  http://' + ip + ':' + str(port) + '    |')
    print('|  Login:   admin / admin123        |')
    print('+' + '-'*35 + '+')
    try:
        app.run(host='0.0.0.0', port=port, debug=True)
    except OSError as e:
        if 'address already in use' in str(e).lower():
            print(f'Port {port} is busy. Use a different port.')
        else:
            print(f'Error: {e}')
    except Exception as e:
        print(f'Error: {e}')
