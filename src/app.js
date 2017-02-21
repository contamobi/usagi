/**
 * Usagi - RabbitMQ client
 *
 * @author Joubert RedRat <me+github@redrat.com.br>
 */

window.$ = window.jQuery = require('jquery');

/**
 * Events on ready
 * @return {void}
 */
$(document).ready(function() {
    $('.usagi-request-field-add').on('click', fieldAdd);
    $('.usagi-request-field-del').on('click', fieldDel);
    $('#usagi-request-send').on('click', sendRequest);
});

/**
 * Add field to request
 * @param {event}
 * @return {String}
 */
function fieldAdd(event) {
    event.preventDefault();

    var html = [];
    html.push('<div class="two fields">');
    html.push('<div class="field">');
    html.push('<input type="text" name="key[]" class="usagi-request-field-key" placeholder="Key">');
    html.push('</div>');
    html.push('<div class="field">');
    html.push('<input type="text" name="value[]" class="usagi-request-field-value" placeholder="Value">');
    html.push('</div>');
    html.push('<button class="ui icon button red usagi-request-field-del">');
    html.push('<i class="fa fa-minus-square" aria-hidden="true"></i>');
    html.push('</button>');
    html.push('</div>');

    $('#usagi-request-fields-container').append(html.join(''));
    $('.usagi-request-field-del').on('click', fieldDel);
}

/**
 * Delete field to request
 * @param {event}
 * @return {void}
 */
function fieldDel(event) {
    event.preventDefault();

    var parent = $(this).parent();
    parent.remove();
}

/**
 * Get request params on form
 * @return {Object}
 */
function getRequestParams() {
    obj = {}

    if ($('.usagi-request-field-key').length == $('.usagi-request-field-value').length) {
        for (i = 0; i < $('.usagi-request-field-key').length; i++) {
            if ($('.usagi-request-field-key')[i].value) {
                obj[$('.usagi-request-field-key')[i].value] = $('.usagi-request-field-value')[i].value;
            }
        }
    }

    return obj;
}

/**
 * Get request data
 * @return {String}
 */
function getRequestData() {
    var data = [];
    var obj = {};

    obj.jsonrpc = "2.0";
    obj.id = generateUniqueId();
    obj.method = $("#usagi-request-method").val();
    obj.params = getRequestParams();

    data.push(JSON.stringify(obj));
    return '[' + data.join('') + ']';
}

/**
 * Send request to queue and display response
 * @return {Bool}
 */
function sendRequest(event) {
    event.preventDefault();

    var error = [];

    if (!$("#usagi-rabbitmq-params").val()) {
        error.push('Connect params');
    }
    if (!$("#usagi-request-queue").val()) {
        error.push('Queue name');
    }
    if (!$("#usagi-request-method").val()) {
        error.push('Method name');
    }

    if (error.length > 0) {
        alert('This fields is required:' + "\n\n" + error.join("\n"));
        return false;
    }

    var protocol = 'amqp://';
    var rabbitmq_host = protocol + $("#usagi-rabbitmq-params").val();
    var queue = $("#usagi-request-queue").val();
    var callback = 'usagi-' + queue + '-callback-' + generateUniqueId();

    var amqp = require('amqplib/callback_api');

    amqp.connect(rabbitmq_host, function(err, conn) {
        conn.createChannel(function(err, ch) {
            ch.assertQueue(callback, {durable: false, autoDelete: true}, function(err, q) {
                var corr = generateUniqueId();

                ch.consume(q.queue, function(msg) {
                    if (msg.properties.correlationId == corr) {

                        var jsonStr = msg.content.toString();
                        var jsonObj = JSON.parse(jsonStr);
                        var jsonPretty = JSON.stringify(jsonObj, null, '  ');
                        $("#usagi-response-container").html(jsonPretty);

                        conn.close();
                        return false;
                        setTimeout(function() {
                            conn.close();
                            process.exit(0);
                        }, 500);
                    }
                });

                ch.sendToQueue(
                    queue,
                    new Buffer(getRequestData()),
                    {correlationId: corr, replyTo: q.queue}
                );
            });
        });
    });
}

/**
 * Get random uuid
 * @return {String}
 */
function generateUniqueId() {
    var data = +new Date;
    return data.toString();
}
