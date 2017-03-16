class Point2D {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    dist(p: Point2D) {
        var diff = new Point2D(p.x - this.x, p.y - this.y);
        return diff.magnitude();

    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

class Corners {
    corners: Point2D[] = [
        new Point2D(0, 0),
        new Point2D(1, 0),
        new Point2D(0, 1),
        new Point2D(1, 1)
    ]
    constructor() {
        this.drawOnCanvas();
    }
    drawOnCanvas() {
        let c = <HTMLCanvasElement>document.getElementById("pointsCanvas");
        let ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        for (let c of this.corners) {
            drawCircle(c);
        }
    }
    update(p: Point2D) {
        console.log("Called Corners update", p);
        let minDist = 2;
        let minIndex = 0;
        for (let i in this.corners) {
            let dist = p.dist(this.corners[i]);
            if (dist < minDist) {
                minDist = dist;
                minIndex = Number(i);
            }
        }
        console.log(minIndex, minDist);
        this.corners[minIndex] = p;
        this.drawOnCanvas();
    }
}

var corners;

let drawCircle = function(p: Point2D) {
    let c = <HTMLCanvasElement>document.getElementById("pointsCanvas");
    let ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.arc(p.x * c.width, p.y * c.height, 5, 0, 2*Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
}

let loadStartImage=function() {
    corners = new Corners();
    console.log("Getting image");
    $.get("http://localhost:5000/givemejpegurls", function(data) {
        console.log("Got image");
        let imageURL = "http://localhost:5000" + data[0];
        let c = <HTMLCanvasElement>document.getElementById("imgCanvas");
        let ctx = c.getContext('2d');
        let img = new Image();
        // img.src = "/DJI_0117.JPG";
        img.src = imageURL;
        ctx.drawImage(img, 0, 0, 800, 600);
    });
    setupCanvas();
    // });
};

let getElementRelativeCoords = function(item, event) {
    let elemRect = item.getBoundingClientRect();
    let absX = event.clientX - elemRect.left;
    let absY = event.clientY - elemRect.top;

    return new Point2D(absX, absY);
}

let getElementNormCoords = function(item, event) {
    let elemRect = item.getBoundingClientRect();
    let absPos = getElementRelativeCoords(item, event);
    let height = elemRect.height;
    let width = elemRect.width;
    let normX = absPos.x / width;
    let normY = absPos.y / height;

    return new Point2D(normX, normY);
}

let setupCanvas = function() {

    let item = document.querySelector("#imgCanvas");
    $("#pointsCanvas").click(function(event) {
        let normCoords = getElementNormCoords(item, event);
        corners.update(normCoords);
        console.log(normCoords.x + ',' + normCoords.y);
    });
};

window.onload = loadStartImage;
