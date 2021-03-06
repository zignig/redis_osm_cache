#!/usr/bin/python 

import web,os
import json,time
import requests,string,traceback
from pymongo import MongoClient
from bson import Binary
from pymongo import GEO2D

client = MongoClient()
db = client.osm_store
tiles = db.tiles
markers = db.markers
markers.ensure_index([("loc", GEO2D)])

web.config.debug =True 

urls = (
	'/','index',
	'/box/(.*)','box',
	'/marker/(.*)','marker',
	'/favicon.ico','favicon',
	'/(.+)','base'

)

points = {}
render = web.template.render('templates')
app = web.application(urls,globals())
server = "http://otile1.mqcdn.com/tiles/1.0.0/osm/"
#server = "http://bl3dr.com:8080/"

class hackspaces:
	namespace = 'hackspace'
	def __init__(self):
		self.pages = []
		#self.load_data()

	def load_page(self,tmp_dict,page):
		url = "http://hackspaces.org/wiki/Special:Ask/-5B-5BCategory:Hackspace-5D-5D/-3FWebsite/-3FLocation/mainlabel%3DHackspace/order%3DASC/limit%3D100/format%3Djson"
		
		print('fetch hackspace page '+str(page))
		try:
			if page > 0:
				r = requests.get(url+'/offset%3D'+str(page*100))
			else:
				r = requests.get(url)
			data = json.loads(r.text) 
			self.pages.append(r.text)
			print 'count '+str(len(data['items']))
			for i in data['items']:
				tmp_dict[i['label']] = i
			return tmp_dict
		except:
			print traceback
			print('fail on page '+str(page))
			return tmp_dict
		

	def load_data(self):
		print(' updating '+self.namespace)
		tmp_dict = {}
		self.items = []
		for i in range(0,15):
			tmp_dict = self.load_page(tmp_dict,i)
		for j in tmp_dict.keys():
			i = tmp_dict[j]
			if 'location' in i.keys():
				tmp = {'name':i['label']}
				tmp['lat'] = i['location']['lat']
				tmp['lon'] = i['location']['lon']
				if 'website' in i.keys():
					tmp['details'] = '<a target=new href="'+i['website']+'">'+i['website']+'</a>'
				self.items.append(tmp)
		#webdb.set(self.namespace,json.dumps(self.items,indent=True))
		self.data = self.items
	
	
	def in_box(self,rect):
		print rect 
		items = [] 
		in_rect = markers.find({"loc": {"$within": {"$box": [[rect[0],rect[1]], [rect[2],rect[3]]]}}})
		for i in in_rect:
			doc = {'lat':i['loc'][0],'lon':i['loc'][1],'name':i['name'],'id':str(i['_id'])}
			items.append(doc)
		return (items)

	def __repr__(self):
		return self.req 

class index:
	def GET(self):
		return render.base()

class box:
	def GET(self,name):
		tmp  = web.input()
		box = string.split(tmp['rect'],',')
		rect = []
		for i in box:
			x = float(i)
			rect.append(x)	
		items = hs.in_box(rect)
		web.header('Content-type', 'application/json') 
		return json.dumps(items)

class marker:
	def GET(self,name):
		tmp  = web.input()
		doc = {}
		print tmp
		doc['loc'] = [float(tmp['lat']),float(tmp['lng'])] 
		doc['name'] = 'no name'
		return_doc = doc.copy()
		markers.insert(doc)
		web.header('Content-type', 'application/json') 
		return json.dumps(([return_doc]))

class favicon:
	def GET(self):
		return ''

class base:
	def GET(self,name):
		data = tiles.find_one({'name':name})
		if data != None:
			return data['image']
		else:
			print 'fetch '+name
			tmp = string.split(name,'/')
			doc = {
				'name':name,
				'zoom':tmp[0],
				'x':tmp[1],
				'y':tmp[2][:-3]
				}
			req = requests.get(server+name)	
			image_data = req.content
			doc['image'] = Binary(image_data)
			tiles.insert(doc)
			return str(req.content)

global hs
hs = hackspaces()
if __name__ == "__main__":
	#hs.load_data()
	app.run()
