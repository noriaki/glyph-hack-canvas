var Stage = Class.get({
    initialize: function(stage) { this.stage = stage; },
    rewind: function() {
        var s = this.stage;
        function deep_copy(layers) { return $.extend(true, [], layers); }
        $.each([
            { name: 'bg', type: 'rectangle' },
            { name: 'lines', type: 'line' },
            { name: 'vertexes', type: 'arc' },
            { name: 'particles', type: 'arc' }
        ], function(i, group) {
            var shapes = deep_copy(s.getLayerGroup(group.name));
            s.removeLayerGroup(group.name);
            $.each(shapes, function(i, shape) {
                s.draw($.extend(true, { type: group.type }, shape._args));
            });
        });
        s.drawLayers();
        //var vertexes = deep_copy(s.getLayerGroup('vertexes'));
        //var particles = deep_copy(s.getLayerGroup('particles'));
    }
});
var Line = Class.get({
    DRAWING: false,
    DRAWN: false,
    STROKE_COLOR: '#00ffdb',
    STROKE_WIDTH: 18,
    SHADOW_COLOR: '#00ffdb',
    SHADOW_BLUR: 36,
    GROUP: 'lines',
    stack: [],
    initialize: function(stage) {
        this.stage = stage;
    },
    start: function() {
        // todo: negative ux by mis-touch
        //this.stage.removeLayerGroup(this.GROUP).drawLayers();
        return this.DRAWING ? false : this.DRAWING = true;
    },
    end: function() {
        Particle.remove_all(this.stage);
        (new Stage(this.stage)).rewind();
        this.destroy();
        this.DRAWING = false;
        this.DRAWN = true;
    },
    destroy: function() {
        while(this.stack.length > 0) { this.stack.pop(); }
    },
    add_vertex: function(vertex) {
        var s = this.stack;
        return s[s.length-1] === vertex ? false : !!this.stack.push(vertex);
    },
    draw: function() {
        if(this.stack.length < 2) return;
        var s_vertex = this.stack[0];
        var e_vertex = this.stack[1];
        if(s_vertex !== e_vertex) {
            if(this.DRAWN) {
                Line.remove_all(this.stage);
                this.DRAWN = false;
            }
            this.stage.drawLine({
                strokeStyle: this.STROKE_COLOR, strokeWidth: this.STROKE_WIDTH,
                shadowColor: this.SHADOW_COLOR, shadowBlur: this.SHADOW_BLUR,
                x1: s_vertex.x, y1: s_vertex.y,
                x2: e_vertex.x, y2: e_vertex.y,
                name: 'line_from_'+s_vertex.name+'_to_'+e_vertex.name,
                layer: true, groups: [this.GROUP]
            });
        }
        this.stack.shift();
    }
});
Line.remove_all = function(stage) {
    var layer_group = (new Line(0,0)).GROUP;
    return stage.removeLayerGroup(layer_group).drawLayers();
};

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
    initialize: function(x, y) {
        this.x = x;
        this.y = y;
        this.name = 'v'+x+'x'+y;
    },
    draw: function(stage) {
        var self = this;
        var handle_mouseover = function(vertex) {
            if(stage.line.DRAWING) {
                if(stage.line.add_vertex(vertex)) {
                    stage.line.draw();
                }
            }
        };
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
            //mousedown: handle_mouseover,
            mousedown: function(vertex) {
                $(stage).trigger('mousedown');
                handle_mouseover(vertex);
                //console.log(this, vertex);
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
Particle.remove_all = function(stage) {
    var layer_group = (new Particle(0,0)).GROUP;
    return stage.removeLayerGroup(layer_group).drawLayers();
};

var BackGround = Class.get({
    COLOR: 'black',
    GROUP: 'bg',
    initialize: function() {},
    draw: function(stage) {
        stage.drawRect({
            fillStyle: this.COLOR, x: 0, y:0, fromCenter: false,
            width: stage.width(), height: stage.height(),
            layer: true, name: 'bg', group: [this.GROUP]
        });
    }
});

jQuery(function($) {
    var $stage = $('#stage');
    $stage.line = new Line($stage);
    var points = [
        [320, 80],
        [80, 218], [560, 218],
        [200, 287], [440, 287],
        [320, 356],
        [200, 425], [440, 425],
        [80, 494], [560, 494],
        [320, 632]
    ];
    var bg = new BackGround();
    bg.draw($stage);
    $.each(points, function(i,point) {
        var vertex = new Vertex(point[0], point[1]);
        vertex.draw($stage);
    });

    $stage.on('mousedown touchstart', function(e) {
        if($stage.line.start()) {
            //console.log('start',e);
            $(e.target).on('mousemove.glyph touchmove.glyph', function(e) {
                //console.log('move',e);
                var particle = new Particle(e.offsetX, e.offsetY);
                particle.draw($stage);
            });
        }
    }).on('mouseup touchend', function(e) {
        $(e.target).off('.glyph');
        $stage.line.end();
        //console.log('end',e);
    });


    window.stage = new Stage($stage);
});
