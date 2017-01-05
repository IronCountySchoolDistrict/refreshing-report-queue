import $ from 'jquery';
import _ from 'underscore';

var jobControlTemplate = $($('#job-control-template').html());
var jobCtrlSelect = $('body');
jobCtrlSelect.prepend(jobControlTemplate);

var refreshButtonTemplate = $($('#refresh-button-template').html());
$('.button-row').eq(0).html(refreshButtonTemplate);

// Clear contents of .box-round
var boxRoundSelect = $('#content-main .box-round');
boxRoundSelect.html();
var reportTemplate = $($('#report-template').html());
boxRoundSelect.html(reportTemplate);

var helperURL = 'getqueue.html';
var homeURL = window.location.pathname;

export default function() {
  //Do a continuous async load of the report queue while at least one job status is 'running' or 'pending'.
  $(() => {
    refreshq();
  });
}

// Array of Objects: { "reportId": num, "preventClicks": boolean }
var preventDupClicks = [];

function refreshq() {
  $.ajax(helperURL, {
    type: 'GET',
    success: function(data) {
      // If the user logs out and logs back in a window or browser other than the current one,
      // they will be kicked out of PS and will have to log back in. The browser transparently handles
      // 302 requests, so jquery will only see data equal to the pw.html login page. Checking for an html
      // tag will show us if it has been redirected.
      if (data.indexOf('<html>') !== -1) {
        alert('You have been logged out. Click OK to login.');
        window.location = '/admin/pw.html';
      }

      $('#reportq').html(data);

      // If this is the first call to refreshq, set up preventDupClicks.
      var rerunIds = _.map(preventDupClicks, function(value) {
        return value.reportId;
      });
      _.each($('.rerun'), function(elem) {
        var rerunData = $(elem).data();
        if (rerunIds.indexOf(rerunData.internalId) === -1) {
          var tempObj = {};
          tempObj.reportId = rerunData.internalId;
          tempObj.preventClicks = false;
          preventDupClicks.push(tempObj);
        }
      });

      // If there are reports displayed
      if ($('.rerun').length !== 0) {
        var rerunLinks = $('.rerun');
        _.each(rerunLinks, function(elem) {
          var reportID = $(elem).data().internalId;
          $(elem).on('click', function(event) {

            // Find the corresponding element in preventDupClicks that matches the reportID
            // of the current element.
            var currentElemMatch = _.find(preventDupClicks, function(val) {
              return val.reportId === reportID;
            });

            // only rerun report if this report hasn't been rerun
            if (!currentElemMatch.preventClicks) {
              event.preventDefault();
              currentElemMatch.preventClicks = true;
              runReport(reportID);
            }
          });
        });
      }
      $('div.cancelicon a').on('click', cancelReport);
      checkstatus();
    }
  });
}

function checkstatus() {
  var img = '<img height="16" width="16" src="' + $("#busyimage").attr("src") + '" />';
  var item = $(".rstatus").filter(function() {
    return (/(pending)|(running)/i).test(this.innerHTML);
  }).append(img);
  $('.rstatus a').attr('target', '_blank'); //alter all reports to open in new tab
  if (item.length > 0) {
    setTimeout(refreshq, 5000);
  }
}

function runReport(rptID) {
  $.get(helperURL, {
    report_batch_jobID: rptID,
    ac: "report_batch_runjobagain"
  }, refreshq);
}

function cancelReport() {
  var link = $(this).attr("href");
  var acval = gup(link, "ac");
  var jobid = gup(link, "report_batch_jobID");
  $.get(homeURL, {
    "report_batch_jobID": jobid,
    "ac": acval
  }, refreshq);
  return false; //override click event
}

function deleteAll() {
  $.get(helperURL, {
    "deleteall": "true",
    "ac": "report_batch_deletejob"
  }, refreshq);
}

function gup(url, name) {
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(url);
  if (results == null) {
    return "";
  }
  return results[1];
}
