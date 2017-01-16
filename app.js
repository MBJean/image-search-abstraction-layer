// Express
var express = require("express");

// The other modules
var mongodb = require("mongodb");
var url = require("url");
var ImagesClient = require("google-images");
var config = require("./config");

// The MongoDB connection
var mLab = "mongodb://" + config.db.host + "/" + config.db.name;
var MongoClient = mongodb.MongoClient;

// The custom Google search
var client = new ImagesClient(config.gs.id, config.gs.api);

var app = express();

// Set port
app.set('port', process.env.PORT || 8080);

// For adding to the DB and displaying metadata
app.get('/imagesearch/:search', function(req, res, next) {
	MongoClient.connect(mLab, function (err, db) {
	  if (err) {
	    console.log("Unable to connect to the database.", err);
	  } else {
	    console.log("Connected to the database.");
	    var collection = db.collection("searches");
		var params = req.params.search;
		var offset = req.query.offset;
		var newSearch = function(db, callback) {
			// check against DB for match, otherwise add to DB to be displayed under 'latest' below
			collection.findOne({ "search": params }, { _id: 0 }, function (err, doc) {
				if (doc === null) {
					var date = new Date();
					var search = { "search": params, "when": date };
					collection.insert([search]);
				}
			});
			// return metadata
			client.search(params, {page: offset})
			.then( function(images) {
				res.send(images);
			});
		};
		newSearch(db, function(){
			db.close();
		});
	  };
	});
});

// For finding all recent searches
app.get("/latest", function(req, res, next) {
	MongoClient.connect(mLab, function (err, db) {
	  if (err) {
	    console.log("Unable to connect to the database.", err);
	  } else {
	    console.log("Connected to the database.");
	    var collection = db.collection("searches");
		var displaySearches = function(db, callback) {
			var output = collection.find().toArray( function(err, docs) {
				if (err) {
					console.log("Unable to connect to the database.", err);
				} else { 
					var output = [];
					docs.forEach( a => {
						// uncomment the sections below to add a 10-day timeframe for recent sesarches to be displayed
						// if ( (new Date() - (new Date(a.when).getTime())) / 60000 < 14400 ) {
							output.push({ search: a.search, when: (a.when || "not specified") });
						//}
					});
					res.json(output);
				}
			});
		}
		displaySearches(db, function() {
			db.close();
		});
	  };
	});
});

app.get("/", function (req, res, next) {
	res.send("This is a simple app that performs an image search (using '/imagesearch/yoursearch') and returns image metadata. You can paginate through the responses by adding the parameter '?offset=#' to the URL. Recent queries are stored by accessing '/latest'. Only unique queries are stored for the purposes of this test app. In a live app, 'latest' would only show searches up to ten days old (commented out above), but here the timeframe is unlimited.");
});

app.listen(app.get('port'), function() {
 console.log('Server started on localhost:' + app.get('port') + '; Press Ctrl-C to terminate.');
});