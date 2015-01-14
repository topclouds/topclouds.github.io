/**
 * Copyright (c) 2013 Zhen, LLC. http://zhen.io
 *
 * MIT License
 *
 * The znD3Column code is basically a copy of https://github.com/btford/angular-d3-demo,
 * which in turn is based on http://mbostock.github.com/d3/ex/stack.html
 *
 */

'use strict';

var app = angular.module("topClouds", ['angular-pages', 'ui.bootstrap']);

app.controller('topCloudsCtrl', ['$rootScope', '$scope', '$window', '$location', '$document', 'topCloudsData', 'znPageManager', 'tc', function ($rootScope, $scope, $window, $location, $document, topCloudsData, znPageManager, tc) {
    function parseUrl(url) {
        var parts = url.split("/"),
            $type = parts[1],
            $year = parts[2],
            $top = parts[3],
            $view = parts[4],
            $limit = parts[5];

        $scope.type = $type || "cloud";
        $scope.year = $year || "2012";
        $scope.view = $view || "chart";
        $scope.top = $top || "100000";
        $scope.limit = $limit || "20";
        $scope.real = getRealYear();

        return {
            "type": $scope.type,
            "year": $scope.year,
            "view": $scope.view,
            "top": $scope.top,
            "limit": $scope.limit
        }
    }

    function getRealYear() {
        if (typeof $scope.real === 'undefined') {
            if ($scope.year === "2012" || $scope.year === "2011" || $scope.year === "2010") {
                $scope.real = $scope.year;
            } else {
                $scope.real = "2012";
            }
        }

        return $scope.real;
    }

    var container = znPageManager.container('zn-pages-container-0');

    $scope.container = container;
    $scope.getRealYear = getRealYear;
    $scope.examples = topCloudsData.getExamples();

    $scope.showExample = function(index) {
        var url = $scope.examples[index].url;

        if (typeof url !== 'undefined') {
            $location.url(url);
        }
    };

    $scope.pageWidth = function() {
        return $window.innerWidth - 250;
    };

    $scope.slideLeft = function () {
        container.slideLeft();
    };

    $scope.slideRight = function () {
        container.slideRight();
    };

    $scope.slideDown = function () {
        container.slideDown();
    };

    $scope.slideUp = function () {
        container.slideUp();
    };

    $scope.slideHome = function () {
        container.slideHome();
    };

    $scope.$watch(function() {
        return $location.url();
    }, function(newVal, oldVal) {
        parseUrl(newVal);
    });

    $scope.$on("tcChartReady", function(event) {
        // URL is "/type/year_or_site/top/view/limit", e.g.:
        // 1. /cloud/2012/100000/chart/20
        // 2. /cloud/amazonaws.com/100000/chart/10

        var url = "/" + event.targetScope.type + "/" + event.targetScope.year + "/" + event.targetScope.top + "/" + event.targetScope.view + "/" + event.targetScope.limit;
        $location.url(url);
        $scope.real = event.targetScope.real;

        var ga = $window.ga || function() { return true; };
        ga('send', 'pageview', $location.url());
    });

    $document.bind('keydown', function(e) {
        $scope.$apply(function() {
            var keyCode = e.keyCode || e.which,
                arrow = {left: 37, up: 38, right: 39, down: 40 };

            switch (keyCode) {
                case arrow.right:
                    if (!container.isRight()) $scope.slideLeft();
                    break;

                case arrow.left:
                    if (!container.isLeft()) $scope.slideRight();
                    break;

                case arrow.down:
                    if (!container.isBottom()) container.slideUp();
                    break;

                case arrow.up:
                    if (!container.isTop()) container.slideDown();
                    break;

                    e.preventDefault();
            }
        })
    });
}]);

app.directive('tcD3Column', ['topCloudsData', 'tc', function (topCloudsData, tc) {

    var colors = ['#2980B9', '#16a085', '#27AE60', '#8E44AD', '#f39c12', '#D35400', '#C0392B', '#7F8C8D'];

    return {
        restrict: 'A',
        terminal: true,
        scope: {
            data: '=',
            view: '=',
            year: '=',
            top: '=',
            type: "=",
            limit: "=",
            real: "="
        },
        link: function (scope, element, attrs) {
            var labelBottom = 155,
                paddingLeft = 55,
                legendBottom = 0,
                paddingBottom = labelBottom + legendBottom,
                width = parseInt(element[0].offsetWidth) - paddingLeft,
                height = parseInt(element[0].offsetHeight) - paddingBottom,
                radius = width / 2;

            // set up initial svg object
            var chart = d3.select(element[0])
                .append("svg")
                .attr("width", width + paddingLeft)
                .attr("height", height + paddingBottom);

            var numFormat = d3.format(">,");

            scope.$watch('data', function (newVal, oldVal) {
                // clear the elements inside of the directive
                chart.selectAll('*').remove();

                // if 'data' is undefined, exit
                if (!newVal) return;

                var values = newVal.values,
                    names = newVal.names,
                    keys = newVal.keys;

                // Based on: http://mbostock.github.com/d3/ex/stack.html
                var nLayers = values.length, // number of layers
                    nValues = values[0].length, // number of samples per layer
                    stack = d3.layout.stack()(values);

                var mx = nValues,
                    my = d3.max(stack, function (d) {
                        return d3.max(d, function (d) {
                            return d.y0 + d.y;
                        });
                    }),
                    mz = d3.max(stack, function (d) {
                        return d3.max(d, function (d) {
                            return d.y;
                        });
                    }),
                    x = function (d) {
                        return d.x * width / mx;
                    },
                    y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, radius]),
                    y0 = function (d) {
                        return height - d.y0 * height / my;
                    },
                    y1 = function (d) {
                        return height - (d.y + d.y0) * height / my;
                    },
                    y2 = function (d) {
                        return d.y * height / mz;
                    }; // or `my` not rescale

                // Layers for each color
                // =====================

                var layers = chart.selectAll("g.layer")
                    .data(stack)
                    .enter()
                    .append("g")
                    .style("fill", function (d, i) {
                        return colors[i % colors.length];
                    })
                    .attr("class", "layer")
                    .attr("transform", "translate(" + paddingLeft + ")");

                // Bars
                // ====

                var bars = layers.selectAll("g.bar")
                    .data(function (d) {
                        return d;
                    })
                    .enter()
                    .append("g")
                    .attr("class", "bar")
                    .attr("transform", function (d) {
                        return "translate(" + x(d) + ",0)";
                    });

                bars.append("rect")
                    .attr("width", x({x: .8}))
                    .attr("x", 0)
                    .attr("y", height)
                    .attr("height", 0)
                    .transition()
                    .delay(function (d, i) {
                        return i * 10;
                    })
                    .duration(500)
                    .attr("y", y1)
                    .attr("height", function (d) {
                        return y0(d) - y1(d);
                    });

                bars.append("title")
                    .text(function(d) {
                        return d.y;
                    });

                if (topCloudsData.isRealYear(scope.year)) {
                    bars.on("click", function(d) {
                        scope.$apply(function(d) {
                            var data = topCloudsData.getSite(scope.type, d.n, scope.top, scope.limit);

                            // we use year for year_or_site, site for drill down
                            // I know..lame :)
                            scope.real = scope.year;
                            scope.year = d.n;
                            scope.data = data;
                        }(d));
                    });
                }

                // X-axis labels
                // =============

                var labels = chart.append("g")
                    .attr("transform", "translate(" + paddingLeft + "," + height + ")")
                    .selectAll("text.xlabel")
                    .data(names)
                    .enter()
                    .append("text")
                    .attr("class", "xlabel")
                    .transition()
                    .delay(0)
                    .duration(500)
                    .attr("transform", function (d, i) {
                        return 'translate(' + (i * width / mx) + ')rotate(-65)';
                    })
                    .attr("text-anchor", "end")
                    .attr("dx", "-0.25em")
                    .attr("dy", function(d) {
                        var dx = x({x:0.8})*0.7;
                        return dx + "px";
                    })
                    .text(function (d, i) {
                        if (topCloudsData.isRealYear(scope.year)) {
                            return d + " - " + (i+1);
                        } else {
                            return d;
                        }
                    });

                // Y-axis labels
                // =============

                var yLabels = chart.append("g")
                    .selectAll("text.ylabel")
                    .data(keys)
                    .enter()
                    .append("text")
                    .attr("class", "ylabel")
                    .attr("text-anchor", "end")
                    .attr("x", 50)
                    .attr("y", function(d, i) {
                        return height / nLayers * i + height / nLayers * 0.6;
                    })
                    .style("display", "none")
                    .text(function(d) {
                        return numFormat(d);
                    });


                // Chart Key
                // =========

                if (keys.length > 0) {
                    var keyText = chart.append("g")
                        .selectAll("text.key")
                        .data(keys.reverse())
                        .enter()
                        .append("text")
                        .attr("class", "key")
                        .attr("y", function (d, i) {
                            return i * 20;
                        })
                        .attr("x", width)
                        .attr("text-anchor", "end")
                        .attr("dy", ".71em")
                        .text(function (d, i) {
                            return numFormat(d);
                        });

                    var keySwatches = chart.append("g")
                        .selectAll("rect.swatch")
                        .data(keys.reverse())
                        .enter()
                        .append("rect")
                        .attr("class", "swatch")
                        .attr("width", 10)
                        .attr("height", 10)
                        .style("fill", function (d, i) {
                            return colors[i % colors.length];
                        })
                        .attr("y", function (d, i) {
                            return i * 20;
                        })
                        .attr("x", function (d, i) {
                            return width - 60;
                        });
                }

                function emitChartReadyEvent() {
                    scope.$emit("tcChartReady", {
                        type: scope.type,
                        year: scope.year,
                        top: scope.top,
                        view: scope.view,
                        limit: scope.limit,
                        real: scope.real
                    });
                }

                function transitionGrid() {
                    chart.selectAll("g.layer rect")
                        .transition()
                        .duration(500)
                        .delay(function(d, i) { return (i % nLayers) * 10; })
                        .attr("y", function(d) {
                            return height / nLayers * d.i;
                        })
                        .attr("height", function(d) {
                            return height / nLayers;
                        });

                    if (keys.length > 0) {
                        chart.selectAll("text.key")
                            .style("display", "none");

                        chart.selectAll("text.ylabel")
                            .transition()
                            .delay(500)
                            .style("display", "block");
                    }

                    chart.selectAll("rect.swatch")
                        .style("display", "none");

                    bars.append("text")
                        .attr("class", "label")
                        .transition()
                        .delay(500)
                        .attr("y", function (d) {
                            return height / nLayers * d.i + height / nLayers * 0.6;
                        })
                        .attr("dx", function(d) {
                            var dx = x({x:0.8})*0.5;
                            return dx + "px";
                        })
                        .attr("text-anchor", "middle")
                        .text(function(d) {
                            return d.y;
                        });

                }

                function transitionStack() {
                    chart.selectAll("g.layer rect")
                        .transition()
                        .duration(500)
                        .delay(function(d, i) { return (i % nLayers) * 10; })
                        .attr("y", y1)
                        .attr("height", function(d) {
                            return y0(d) - y1(d);
                        });

                    if (keys.length > 0) {
                        chart.selectAll("text.key")
                            .style("display", "block");

                        chart.selectAll("text.ylabel")
                            .style("display", "none");
                    }

                    chart.selectAll("rect.swatch")
                        .style("display", "block");

                    chart.selectAll('text.label').remove();
                }

                if (scope.view === "data") {
                    transitionGrid();
                } else {
                    transitionStack();
                }

                scope.$watch('view', function (newVal, oldVal) {
                    if (newVal === oldVal) return;

                    if (newVal === "data") {
                        transitionGrid();
                    } else {
                        transitionStack();
                    }

                    emitChartReadyEvent();
                });

                emitChartReadyEvent();
            });

            //
            scope.$watch('type + "/" + year + "/" + top + "/" + limit', function(newVal, oldVal) {
                if (newVal) {
                    var match = newVal.match(/^(.+)\/(.+)\/(.+)\/(.+)/),
                        type = match[1],
                        year = match[2],
                        top = match[3],
                        limit = match[4];

                    if (year !== "2012" && year !== "2011" && year !== "2010") {
                        scope.data = topCloudsData.getSite(type, year, top, limit);
                    } else {
                        scope.data = topCloudsData.getData(type, year, top, limit);
                    }
                }
            });
        }
    }
}]);

app.factory("tc", [ function () {
    return {
        log: function () {
            var debug = true,
                debug2 = true,
                debug3 = true,
                d = parseInt(arguments[0]),
                i;

            if ((d === 1 && debug) || (d === 2 && debug2) || (d === 3 && debug3)) {
                console.log(new Date());
                for (i = 1; i < arguments.length; i++) {
                    console.log(arguments[i]);
                }
            }
        }
    }
}]);

app.factory("topCloudsData", ['tc', function (tc) {
    var examples = [
        {
            "text": "Top 10 web servers of 2012",
            "url": "/server/2012/100000/chart/10"
        },
        {
            "text": "Top 10 hosting providers of 2012",
            "url": "/cloud/2012/100000/chart/10"
        },
        {
            "text": "Number of top sites hosted by top 10 providers",
            "url": "/cloud/2012/100000/data/10"
        },
        {
            "text": "Amazon Web Services gaining ground year over year",
            "url": "/cloud/amazonaws.com/100000/chart/20"
        },
        {
            "text": "Nginx retains top spot in serving the top 1000 sites",
            "url": "/server/nginx/1000/chart/20"
        },
        {
            "text": "Microsoft loses top spot in serving the top 100K sites",
            "url": "/server/microsoft-iis/100000/chart/20"
        },
        {
            "text": "Linode leaps to #12 in 2012, up from #48 in 2010",
            "url": "/cloud/linode.com/100000/chart/20"
        },
    ];

    var tcKeys = {
        "100": 0,
        "1000": 1,
        "5000": 2,
        "10000": 3,
        "50000": 4,
        "100000": 5
    };

    var tcData = {
        "2012": {},
        "2011": {},
        "2010": {}
    };

    var tcYears = ["2012", "2011", "2010"];

    if (typeof cp2012 !== 'undefined') {
        tcData["2012"]["cloud"] = cp2012;
    }

    if (typeof cp2011 !== 'undefined') {
        tcData["2011"]["cloud"] = cp2011;
    }

    if (typeof cp2010 !== 'undefined') {
        tcData["2010"]["cloud"] = cp2010;
    }

    if (typeof ws2012 !== 'undefined') {
        tcData["2012"]["server"] = ws2012;
    }

    if (typeof ws2011 !== 'undefined') {
        tcData["2011"]["server"] = ws2011;
    }

    if (typeof ws2010 !== 'undefined') {
        tcData["2010"]["server"] = ws2010;
    }

    return {
        isRealYear: function(year) {
            for (var i = 0; i < tcYears.length; i++) {
                if (tcYears[i] === year) return true;
            }

            return false
        },

        getData: function (type, year, top, limit) {
                // Get the top X key (100, 1000, 5000, 10000, 50000, 100000)
            var t = tcKeys[top],
                // Get the overall data set for the year and type (cloud or server)
                tcd = tcData[year][type],
                // Get the data for the year/type
                d = tcd[t].data,
                // Get the keys (subset of t)
                keys = tcd[t].keys,
                values = [],
                names = [];

            // Need to return a two dimensional values array. First dimension is layers where each layer
            // is the values for each of the sites. So for the top 100,000 sites, there will be six layers,
            // including layer 1 for top 100k, layer 2 for top 50k, layer3 for top 10k, layer 4 for top 5k,
            // layer 5 for top 1k, and layer 6 for top 100. The second dimension (e.g., each layer, it is
            // an array of objects, each object {x: x, y: y, i: i} represents data for each of the top sites.
            //
            // x = the column number in the column chart
            // y = the height of the bar
            // i = the layer number of the column

            for (var i = 0; i < limit; i++) {
                names.push(d[i].name);
                var len = d[i].values.length - 1;

                for (var j = len; j >= 0; j--) {
                    if (!values[len - j]) values[len - j] = [];
                    values[len - j][i] = { x: i, y: d[i].values[j], i: j, n: d[i].name };
                }
            }

            return { names: names, values: values, keys: keys };
        },

        getSite: function(type, site, top, limit) {
            var values = [],
                names = [],
                keys,
                l = Math.min(limit, tcYears.length);

            for (var k = 0; k < l; k++) {
                var year = tcYears[k],
                    tcd = tcData[year][type],
                    t = tcKeys[top],
                    data = tcd[t].data;

                keys = tcd[t].keys;

                for (var i = 0; i < data.length; i++) {
                    if (data[i].name === site) {
                        names.push(year + " - " + (i+1));
                        var len = data[i].values.length - 1;

                        for (var j = len; j >= 0; j--) {
                            if (!values[len - j]) values[len - j] = [];
                            values[len - j][k] = { x: k, y: data[i].values[j], i: j, n: data[i].name };
                        }

                        break;
                    }
                }
            }

            return { names: names, values: values, keys: keys};
        },

        getExamples: function() {
            return examples;
        }

    }
}]);
