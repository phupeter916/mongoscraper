var path = require("path");
var express = require("express");
var axios = require("axios");
var cheerio = require("cheerio");
var request = require("request");
const logger = require('morgan');
var bodyParser = require("body-parser");

// Require all models
var db = require("../models");

// Create all html (no passport authentication required) query routes.
module.exports = function (app) {

    // "/" route loads home.handlebars
    app.get("/", function (req, res) {
        res.render("home");
    });


    // route for saved_articles
app.get("/saved_articles", function (req, res) {
  db.Article.find({saved:false}).limit(20)
      .then(function (DbArticles) {
          res.render(("saved_articles"), { articles: DbArticles })
      }).catch(function(err) {
          console.error(err);
      })
});


//route for view_articles
app.get("/view_articles", function (req, res) {
  db.Article.find({saved:false}).limit(20)
      .then(function (DbArticles) {
          res.render(("view_articles"), { articles: DbArticles })
      }).catch(function(err) {
          console.error(err);
   
        })
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Delete a saved article
app.post("/delete_article/:id", function (req, res) {
  // Use the article id to find and update its saved boolean
  db.Article.update({ "_id": req.params.id }, { "saved": false, "note": [] })
      .then(function (DbArticles) {
          console.log(DbArticles)
          res.render(("view_articles"), { articles: DbArticles })
      })
      .catch(function (err) {
          // db.find error
          console.log(err);
      })
});

// Route for saving/updating an Article's associated Note
app.post("/save_articles/:id", function(req, res) {
  
  // save the new note that gets posted to the Notes collection
  db.Note.create(req.body)
  // then find an article from the req.params.id
  .then(function(dbNote) {

  // and update it's "note" property with the _id of the new note
  return db.Article.findOneAndUpdate({ _id: req.params.id }, {
  note: dbNote._id }, { new: true });
  })
  .then(function(dbArticle) {
    res.render(("view_articles"), { articles: DbArticles })
      })
  .catch(function(err) {
    res.json(err);
  });

});

// Route for saved articles
app.post("/saved_articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// POST route - create a new note
app.post("/save_note/:id", function (req, res) {

  // Create a new note and pass the req.body to the entry
  db.Note.create({ body: req.body.body })
      .then(function (dbNote) {
          // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
          // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
          // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
          return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { note: dbNote._id } }, { new: true });
      })
      .then(function (dbArticle) {
          // If we were able to successfully update an Article, send it back to the client
          res.json(dbArticle);
      })
      .catch(function (err) {
          // If an error occurred, send it to the client
          res.json(err);
      });
});

// Delete note
app.delete('/delete_note/:id', function (req, res) {
  db.Note
      .findByIdAndDelete(req.params.id)
      .then(result => res.json(result))
      .catch(err => res.json(err));
});

// Routes

// A GET route for scraping the NYTimes website
app.get("/scrape", function(req, res) {
    // First, we grab the body of the html with axios
    axios.get("http://espn.com/").then(function(response) {
      // Then, we load that into cheerio and save it to $ for a shorthand selector
      console.log(response);
      
      var $ = cheerio.load(response.data);
      //var newResultArticle = [];
      console.log(response.data);
  
      // Now, we grab every h2 within an article tag, and do the following:
      $("article h2").each(function(i, element) {
        // Save an empty result object
        var result = {};
        console.log(result);
  
        // Add the text and href of every link, and save them as properties of the result object
        result.title = $(this)
          .children("a")
          .text();
        result.summary = $(this)
          .children(".summary")
          .text();
        result.link = $(this)
          .children("a")
          .attr("href");
  
        // Create a new Article using the `result` object built from scraping
        db.Article.create(result)
          .then(function(dbArticle) {
            // Console the results
            console.log(dbArticle);
          })
          .catch(function(err) {
            // If an error occurred, send it to the client
            return res.json(err);
          });
      });
  
      // If we were able to successfully scrape and save an Article, send a message to the client
      res.send("Scrape Complete");
    });
  });
  
};





