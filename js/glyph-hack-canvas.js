// ----- Stage
var Stage = Class.get({
    LAYER_GROUPS: [
        { name: 'bg', type: 'rectangle' },
        { name: 'lines', type: 'line' },
        { name: 'vertexes', type: 'arc' },
        { name: 'particles', type: 'arc' }
    ],
    POINTS: [
        [320, 80],
        [80, 218], [560, 218],
        [200, 287], [440, 287],
        [320, 356],
        [200, 425], [440, 425],
        [80, 494], [560, 494],
        [320, 632]
    ],
    initialize: function(stage) {
        this.stage = stage;
        this.Vertexes = new Vertexes(this.stage, this.POINTS);
        this.BackGround = new BackGround(this.stage);
        this.Particles = new Particles(this.stage);
        this.Glyph = new Glyph(this.stage);
    },
    setup: function() {
        var $stage = this.stage;
        this.BackGround.draw();
        this.Vertexes.draw();
        $stage
            .on('mousedown touchstart', this.Glyph.start_fn())
            .on('mousedown touchstart', this.Particles.start_fn())
            .on('mouseup touchend', this.Glyph.end_fn())
            .on('mouseup touchend', this.Particles.end_fn());
    },
    rewind: function() {
        $.each([
            this.BackGround, this.Glyph, this.Vertexes
        ], function(i, shapes) { shapes.rewind(); });
    }
});

// ----- Glyph
var Glyph = Class.get({
    DRAWING: false,
    DRAWN: false,
    EVENT_HACKED: 'glyphhacked',
    vertexes: [],
    lines: [],
    initialize: function(stage) { this.stage = stage; },
    rewind: function() {
        this.stage.removeLayerGroup((new Line()).GROUP).drawLayers();
        $.each(this.lines, function(i, line) {
            line.draw();
        });
    },
    start_fn: function() {
        var self = this;
        return function(e) {
            return self.start();
        }
    },
    start: function() {
        return this.DRAWING ? false : this.DRAWING = true;
    },
    pass_fn: function() {
        var self = this;
        return function(vertex) {
            var v = $.stage.Vertexes.find(vertex.name);
            if(self.DRAWING && self.add_vertex(v)) {
                v.routing = true;
                var vertexes_length = self.vertexes.length;
                if(vertexes_length > 1) {
                    if(self.DRAWN) {
                        $.stage.Vertexes.reset($.extend([], self.vertexes));
                        Line.remove_all(self.stage);
                        self.empty_lines();
                        self.DRAWN = false;
                    }
                    var endpoints = self.vertexes.slice(-2);
                    var line = new Line(self.stage, endpoints[0], endpoints[1]);
                    line.draw();
                    self.lines.push(line);
                }
            }
        };
    },
    end_fn: function() {
        var self = this;
        return function(e) {
            return self.end();
        }
    },
    end: function() {
        this.DRAWING = false;
        $.stage.rewind();
        this.DRAWN = true;
        this.empty_vertexes();
        this.trigger(this.EVENT_HACKED);
        return true;
    },
    empty_vertexes: function() {
        while(this.vertexes.length > 0) { this.vertexes.pop(); }
    },
    empty_lines: function() {
        while(this.lines.length > 0) { this.lines.pop(); }
    },
    add_vertex: function(vertex) {
        var vs = this.vertexes;
        return vs[vs.length-1] === vertex ? false : !!vs.push(vertex);
    }
});

// ----- Line
var Line = Class.get({
    STROKE_COLOR: '#00ffdb',
    STROKE_WIDTH: 18,
    SHADOW_COLOR: '#00ffdb',
    SHADOW_BLUR: 36,
    GROUP: 'lines',
    initialize: function(stage, start_point, end_point) {
        this.stage = stage;
        this.start_point = start_point;
        this.end_point = end_point;
    },
    draw: function() {
        var s_vertex = this.start_point;
        var e_vertex = this.end_point;
        if(s_vertex !== e_vertex) {
            this.stage.drawLine({
                strokeStyle: this.STROKE_COLOR, strokeWidth: this.STROKE_WIDTH,
                shadowColor: this.SHADOW_COLOR, shadowBlur: this.SHADOW_BLUR,
                x1: s_vertex.x, y1: s_vertex.y,
                x2: e_vertex.x, y2: e_vertex.y,
                name: 'line_from_'+s_vertex.name+'_to_'+e_vertex.name,
                layer: true, groups: [this.GROUP]
            });
        }
    }
});
Line.remove_all = function(stage) {
    var layer_group = (new Line()).GROUP;
    return stage.removeLayerGroup(layer_group).drawLayers();
};

// ----- Vertexes
var Vertexes = Class.get({
    items: {},
    initialize: function(stage, points) {
        this.stage = stage;
        var self = this;
        $.each(points, function(i, point) {
            var name = 'v' + ('0'+(i+1)).slice(-2);
            self.items[name] = new Vertex(point[0], point[1], name);
        });
    },
    draw: function() {
        var self = this;
        $.each(this.items, function(name, vertex) {
            vertex.draw(self.stage);
        });
    },
    rewind: function() {
        this.stage.removeLayerGroup(this.group_name()).drawLayers();
        this.draw();
    },
    reset: function(current_vertexes) {
        $.each(this.items, function(i, vertex) {
            var current = false;
            $.each(current_vertexes, function(j, cv) { if(vertex === cv) current = true; });
            if(!current) { vertex.routing = false; }
        });
        this.rewind();
    },
    find: function(name) { return this.items[name]; },
    group_name: function() { return (new Vertex()).GROUP; },
    size: function() { return Object.keys(this.items).length; }
});

// ----- Vertex
var Vertex = Class.get({
    FILL_COLOR: 'black',
    FILL_COLOR_ROUTE: 'white',
    STROKE_COLOR: 'white',
    STROKE_WIDTH: 5,
    RADIUS: 18,
    RADIUS_SNAP: 30,
    SHADOW_COLOR: '#d8c8d7',
    SHADOW_BLUR: 45,
    GROUP: 'vertexes',
    routing: false,
    initialize: function(x, y, name) {
        this.x = x;
        this.y = y;
        this.name = (name === undefined ? 'v'+x+'x'+y: name);
    },
    draw: function(stage) {
        var self = this;
        var handle_mouseover = $.stage.Glyph.pass_fn();
        stage.drawArc({
            layer: true, name: this.name, groups: [this.GROUP],
            fillStyle: this.fillStyle(),
            strokeStyle: this.STROKE_COLOR, strokeWidth: this.STROKE_WIDTH,
            x: this.x, y: this.y, radius: this.RADIUS,
            shadowColor: this.SHADOW_COLOR, shadowBlur: this.SHADOW_BLUR, //intangible: true,
            mouseover: function(vertex) {
                $(this).animateLayer(vertex, {
                    scale: 1.2, fillStyle: self.FILL_COLOR_ROUTE
                }, 'fast');
                handle_mouseover(vertex);
            },
            mousedown: function(vertex) {
                $(stage).trigger('mousedown');
                handle_mouseover(vertex);
            },
            mouseout: function(vertex) {
                $(this).animateLayer(vertex, {
                    scale: 1, fillStyle: self.fillStyle()
                }, 'slow');
            },
        });
    },
    fillStyle: function() {
        return this.routing ? this.FILL_COLOR_ROUTE : this.FILL_COLOR;
    }
});

// ----- Particles
var Particles = Class.get({
    GROUP: 'particles',
    initialize: function(stage) {
        this.stage = stage;
    },
    start_fn: function() {
        var self = this;
        return function(e) {
            $(e.target).on('mousemove.particle touchmove.particle', function(e) {
                (new Particle(e.offsetX, e.offsetY)).draw(self.stage);
            });
        }
    },
    end_fn: function() {
        var self = this;
        return function(e) {
            $(e.target).off('.particle');
            self.remove_all();
        }
    },
    remove_all: function() {
        return this.stage.removeLayerGroup(this.GROUP).drawLayers();
    }
});

// ----- Particle
var Particle = Class.get({
    RAND_XY_RANGE: 8,
    RAND_RADIUS_RANGE: 5,
    RADIUS_BASE: 10,
    GROUP: 'particles',
    initialize: function(x, y) {
        this.org_x = x;
        this.org_y = y;
        this.delta_x = Math.random() * (this.RAND_XY_RANGE * 2) - this.RAND_XY_RANGE;
        this.delta_y = Math.random() * (this.RAND_XY_RANGE * 2) - this.RAND_XY_RANGE;
        this.x = this.org_x + this.delta_x;
        this.y = this.org_y + this.delta_y;
        this.radius = this.RADIUS_BASE +
            Math.random() * (this.RAND_RADIUS_RANGE * 2) - this.RAND_RADIUS_RANGE;
        this.name = 'p'+x+'x'+y;
    },
    draw: function(stage) {
        stage.drawArc({
            layer: true, name: this.name, groups: [this.GROUP],
            fillStyle: 'white', strokeWidth: 0,
            x: this.x, y: this.y, radius: this.radius,
            shadowColor: '#fffbbb', shadowBlur: 10,
            intangible: true, opacity: 0.9
        });
    }
});

// ----- BackGround
var BackGround = Class.get({
    COLOR: 'black',
    GROUP: 'bg',
    initialize: function(stage) { this.stage = stage; },
    draw: function() {
        var stage = this.stage;
        stage.drawRect({
            fillStyle: this.COLOR, x: 0, y:0, fromCenter: false,
            width: stage.width(), height: stage.height(),
            layer: true, name: 'bg', group: [this.GROUP]
        });
    },
    rewind: function() {
        this.stage.removeLayerGroup(this.GROUP).drawLayers();
        this.draw();
    }
});

jQuery(function($) {
    $.stage = new Stage($('#stage'));
    $.stage.setup();
});
