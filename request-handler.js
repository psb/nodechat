/* You should implement your request handler function in this file.
 * But you need to pass the function to http.createServer() in
 * basic-server.js.  So you must figure out how to export the function
 * from this file and include it in basic-server.js. Check out the
 * node module documentation at http://nodejs.org/api/modules.html. */

var defaultCorsHeaders = require("./lib/cors.js").defaultCorsHeaders;
var fs = require("fs");
var _ = require("underscore");
var mysql = require("mysql");
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'bacon',
  password : 'pass',
  database: "chat_db",
  multipleStatements: true
});

connection.connect();

var messagesObject = {
  list: [],

  getMessages: function(res){
    var query = connection.query('SELECT * FROM messages;');
    var that = this;
    this.list = [];

    query
      .on('result', function(row) {
        that.list.push(row);
      })
      .on('end', function() {
        res.end(JSON.stringify(that.list));
      });
  },

  writeToDB: function(newMessage){
    var resultId = null;
    var query1 = connection.query('insert ignore into users set user_name ='+mysql.escape(newMessage.user_name)+';');
    var query2 = connection.query(
      'insert into messages (user_name, room_name) ' +
      'SELECT users.user_name, rooms.room_name FROM users, rooms WHERE users.user_name=' + 
      mysql.escape(newMessage.user_name) + 
      'AND rooms.room_name=' + mysql.escape(newMessage.room_name) + 
      ';' , function(error, result){
        resultId = result.insertId;
      }
    );

    query1
      .on('end', function() {
        query2
          .on('end', function() {
            connection.query(
              "update messages set messages.text=" + 
              mysql.escape(newMessage.text) + 
              "where messages.id=" + 
              resultId + 
              ";"
            );
          });
      })
      .on('error', function(e) {
        console.log(e);
      });
  }
};

var createResponse = function(code, response){
  var statusCode = code;
  var headers = defaultCorsHeaders();
  headers['Content-Type'] = "text/plain";
  response.writeHead(statusCode, headers);
  return response;
};

var handlePostRequest = function(request, response) {
  if(request.url === "/1/classes/messages"){
    request.on('data', function(chunk) {
      request.content = '';
      request.content += chunk.toString();
    });
    
    request.on('end', function() {
      console.log('POST request: ',request.content);
      var msg = JSON.parse(request.content);
      messagesObject.writeToDB(msg);
      response = createResponse(200, response);
      response.end();
    });
  }
};

var handleGetRequest = function(request, response){
  if(request.url === "/1/classes/messages"){
    response = createResponse(200, response);
    messagesObject.getMessages(response);
  }
};
 
exports.handlePostRequest = handlePostRequest;
exports.handleGetRequest = handleGetRequest;