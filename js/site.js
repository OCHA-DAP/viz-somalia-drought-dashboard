function hxlProxyToJSON(input){
  var output = [];
  var keys = [];
  input.forEach(function(e,i){
    if(i==0){
      e.forEach(function(e2,i2){
        var parts = e2.split('+');
        var key = parts[0]
        if(parts.length>1){
          var atts = parts.splice(1,parts.length);
          atts.sort();                    
          atts.forEach(function(att){
            key +='+'+att
          });
        }
        keys.push(key);
      });
    } else {
      var row = {};
      e.forEach(function(e2,i2){
        row[keys[i2]] = e2;
      });
      output.push(row);
    }
  });
  return output;
}

function parseDates(tags,data){
  var parseDateFormat = d3.time.format("%d-%m-%Y").parse;
  data.forEach(function(d){
    tags.forEach(function(t){
      d[t] = parseDateFormat(d[t]);
    });
  });
  return data;
}

function checkIntData(d){
  return (isNaN(parseInt(d)) || parseInt(d)<0) ? 0 : parseInt(d);
}

var date_sort = function (d1, d2) {
  if (d1['#date'] > d2['#date']) return 1;
  if (d1['#date'] < d2['#date']) return -1;
  return 0;
}

var target_date_sort = function (d1, d2) {
  if (d1['#date+start'] > d2['#date+start']) return 1;
  if (d1['#date+start'] < d2['#date+start']) return -1;
  return 0;
}

function monthDiff(d1, d2) {
  return d2.getMonth() - d1.getMonth() + 1;
}

function getMonthName(monthID) {
  var monthArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthArray[monthID];
}

var formatComma = d3.format(',');

function generateDescription(descriptionData){
  $('.title span').text('as of ' + descriptionData[0]['#date+reported']);
  $('.description-text p').text(descriptionData[0]['#description'])
}

function updateCharts(region) {

}

var mapsvg,
    centered;
var fillColor = '#dddddd';
var hoverColor = '#3b88c0';
var inactiveFillColor = '#f2efe9';
function generateMap(adm1, countrieslabel){
  //remove loader and show map
  $('.sp-circle').remove();
  $('.map-container').fadeIn();

  var width = $('#map').width();
  var height = 400;

  mapsvg = d3.select('#map').append('svg')
    .attr('width', width)
    .attr('height', height);

  var mapscale = ($('body').width()<768) ? width*4.7 : width*2.7;
  var mapprojection = d3.geo.mercator()
    .center([47, 5])
    .scale(mapscale)
    .translate([width / 2, height / 2]);    

  var g = mapsvg.append('g').attr('id','adm1layer');
  var path = g.selectAll('path')
    .data(adm1.features).enter()
    .append('path')
    .attr('d', d3.geo.path().projection(mapprojection))
    .attr('id',function(d){
      return d.properties.admin1Name;
    })
    .attr('class',function(d){
      var classname = (d.properties.admin1Name != '0') ? 'adm1' : 'inactive';
      return classname;
    })
    .attr('fill', function(d) {
      var clr = (d.properties.admin1Name != '0') ? fillColor: inactiveFillColor;
      return clr;
    })
    .attr('stroke-width', 1)
    .attr('stroke','#7d868d');

  //map tooltips
  var maptip = d3.select('#map').append('div').attr('class', 'd3-tip map-tip hidden');
  path.filter('.adm1')
    .on('mousemove', function(d,i) {
      $(this).attr('fill', hoverColor);
      var mouse = d3.mouse(mapsvg.node()).map( function(d) { return parseInt(d); } );
      maptip
        .classed('hidden', false)
        .attr('style', 'left:'+(mouse[0]+20)+'px; top:'+(mouse[1]+20)+'px')
        .html(d.properties.admin1Name)
    })
    .on('mouseout',  function(d,i) {
      if (!$(this).data('selected'))
        $(this).attr('fill', fillColor);
      maptip.classed('hidden', true);
    })
    .on('click', function(d,i){
      selectRegion($(this), d.properties.admin1Name);
    }); 

  //create country labels
  var country = g.selectAll('text')
    .data(countrieslabel).enter()
    .append('text')
    .attr('class', 'countryLabel')
    .attr("transform", function(d) {
      return "translate(" + mapprojection([d.coordinates[0], d.coordinates[1]]) + ")";
    })
    .text(function(d){ return d.country; });

  $('.reset-btn').on('click', reset);
}

function selectRegion(region, name) {
  region.siblings().data('selected', false);
  region.siblings('.adm1').attr('fill', fillColor);
  region.attr('fill', hoverColor);
  region.data('selected', true);
  $('.regionLabel > div > strong').html(name);
  updateCharts(name);
}

function reset() {
  $('#adm1layer').children('.adm1').attr('fill', fillColor);
  $('.regionLabel > div > strong').html('All Regions');
  updateCharts('');
  return false;
}

/** River Level Charts **/
function generateRiverLevels(riverLevel1Data, riverLevel2Data) {
  var riverDataArray = [riverLevel1Data, riverLevel2Data];
  for (var i=0; i<riverDataArray.length; i++){
    var riverData = riverDataArray[i];
    var riverChart = '#riverLevel'+ (i+1) +'Chart';
    var date = ['x'];
    var severity = ['severity'];
    var severityMean = ['severityMean'];
    for (var j=0; j<riverData.length; j++){
      date.push(riverData[j]['#date+reported']+'-'+riverData[j]['#indicator+num']);
      severity.push(riverData[j]['#severity']);
      severityMean.push(riverData[j]['#severity+mean']);
    }

    var chart = c3.generate({
      bindto: riverChart,
      data: {
        x: 'x',
        xFormat: '%b-%d',
        columns: [date, severity, severityMean]
      },
      axis: {
        x: {
          type: 'timeseries',
          tick: {
            count: 52,
            format: '%m-%d'
          }
        }
      }
    });
  }
}

var somCall = $.ajax({ 
  type: 'GET', 
  url: 'data/som-merged-topo.json',
  dataType: 'json',
});

var adm1Call = $.ajax({ 
  type: 'GET', 
  url: 'data/som_adm1.json',
  dataType: 'json',
});

var countrieslabelCall = $.ajax({ 
  type: 'GET', 
  url: 'data/countries.json',
  dataType: 'json',
});

var descriptionCall = $.ajax({ 
  type: 'GET', 
  url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1LVJwQKBkX11ZTCy6UwPYlskJ1M1UhjRLkIJh4n6sUBE%2Fedit%23gid%3D0',
  dataType: 'json',
});

var riverLevel1Call = $.ajax({ 
  type: 'GET', 
  url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F16QXGa8aGIka_a0lhYx2O0rSVSy5KkUhmiNtOqGH0dVo%2Fedit%23gid%3D1461276083',
  dataType: 'json',
});

var riverLevel2Call = $.ajax({ 
  type: 'GET', 
  url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F16QXGa8aGIka_a0lhYx2O0rSVSy5KkUhmiNtOqGH0dVo%2Fedit%23gid%3D299718476',
  dataType: 'json',
});

var idpCall = $.ajax({ 
  type: 'GET', 
  url: 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F12o4Si6pqbLsjkxuWpZjtC8sIvSFpD7_DtkrMUAbt32I%2Fedit%23gid%3D1239684438',
  dataType: 'json',
});

//description data
$.when(descriptionCall).then(function(descriptionArgs){
  var descriptionData = hxlProxyToJSON(descriptionArgs);
  generateDescription(descriptionData);
});

//map data
$.when(adm1Call, somCall, countrieslabelCall).then(function(adm1Args, somArgs, countrieslabelArgs){
  var countrieslabel = countrieslabelArgs[0].countries;
  generateMap(somArgs[0], countrieslabel);
});

//river levels data
$.when(riverLevel1Call, riverLevel2Call).then(function(riverLevel1Args, riverLevel2Args){
  var riverLevel1Data = hxlProxyToJSON(riverLevel1Args[0]);
  var riverLevel2Data = hxlProxyToJSON(riverLevel2Args[0]);
  generateRiverLevels(riverLevel1Data, riverLevel2Data);
});

