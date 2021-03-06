interface Point {
    x: number;
    y: number;
}

interface MultiPoints extends Array<Point>{}

let corners:MultiPoints = [
    {x: 0, y: 0},
    {x: 1, y: 0},
    {x: 0, y: 1},
    {x: 1, y: 1}
];

let appState:AppState;

const server = "http://localhost:5000";

class AppState {
    identifiers: string[];
    currentIndex: number = 0;
    done: boolean = false;
    constructor(data) {
        this.identifiers = data.map(function(obj){return obj["identifier"];});
        console.log("Identifiers: " + this.identifiers);
        this.updateCorners();
    }
    currentImageURL(): URL {
        let cur_img_url = new URL(server
                                  + "/items/"
                                  + this.identifiers[this.currentIndex]
                                  + "/raw");
        console.log("Current image url: " + cur_img_url);
        return cur_img_url;
    }
    updateCorners() {
      let getURL = server
                    + "/overlays"
                    + '/quadrilateral_points/'
                    + this.identifiers[this.currentIndex];
      $.ajax({
          type: 'GET',
          url: getURL,
          success: function(data) {
            console.log(data.length);
            if (data.length !== 4) {
                corners = [
                    {x: 0, y: 0},
                    {x: 1, y: 0},
                    {x: 0, y: 1},
                    {x: 1, y: 1}
                ];
            } else {
                corners = data;
            }
            console.log(JSON.stringify(corners));
            drawCorners(corners);
          },
      });
    }
    updateProgressBar() {
        let human_index = this.currentIndex + 1;
        let progress_str = "Progress: " + human_index + "/" + this.identifiers.length;
        console.log(progress_str);
        document.querySelector("#progressBar").innerHTML = progress_str;
    }
    persistInOverlay(corners: MultiPoints) {
      let putURL = server
                    + "/overlays"
                    + '/quadrilateral_points/'
                    + this.identifiers[this.currentIndex];
      console.log('persistInOverlay', JSON.stringify(corners), putURL);
      $.ajax({
          type: 'PUT',
          url: putURL,
          data: JSON.stringify(corners),
          success: function(data) {
              console.log("Success!");
              appState.currentIndex += 1;
              appState.updateProgressBar();
              if (appState.currentIndex < appState.identifiers.length) {
                  let imageURL = appState.currentImageURL();
                  console.log(imageURL);
                  drawImageFromURL(imageURL);
                  appState.updateCorners();
              } else {
                  // Done.
                  appState.done = true;
                  document.querySelector("#progressBar").innerHTML = "Done!  &#128512;";
                  document.querySelector("#workArea").innerHTML = "";
                  document.querySelector("#help").innerHTML = "Do some post processing...";
              }
          },
          contentType: "application/json"
      });
    }
    next() {
        this.persistInOverlay(corners);
    }
    prev() {
        if (this.currentIndex > 0) {
            console.log("previous");
            this.currentIndex -= 1;
            drawImageFromURL(this.currentImageURL());
            this.updateProgressBar();
            this.updateCorners();
        }
    }
}

let drawImageFromURL = function(imageURL: URL) {
    let c = <HTMLCanvasElement>document.getElementById("imgCanvas");
    let ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    let img = new Image();
    img.src = String(imageURL);
    img.addEventListener('load', function() {
        ctx.drawImage(img, 0, 0, 800, 600);
    });
}

let initialiseAppState = function() {
    $.get(server + "/items", function(data) {
        appState = new AppState(data["_embedded"]["items"]);
        let imageURL = appState.currentImageURL();
        drawImageFromURL(imageURL);
        appState.updateProgressBar();
    });
}

let getElementRelativeCoords = function(item, event): Point {
    let elemRect = item.getBoundingClientRect();
    let absX = event.clientX - elemRect.left;
    let absY = event.clientY - elemRect.top;
    return {"x": absX, "y": absY};
}

let getElementNormCoords = function(item, event): Point {
    let elemRect = item.getBoundingClientRect();
    let absPos = getElementRelativeCoords(item, event);
    let height = elemRect.height;
    let width = elemRect.width;
    let normX = absPos.x / width;
    let normY = absPos.y / height;

    return {"x": normX, "y": normY};
}

let magnitude = function(p: Point): number {
    return Math.sqrt(p.x * p.x + p.y * p.y);
}

let distance = function(p1: Point, p2: Point): number {
    let diff:Point = {"x": p1.x - p2.x, "y": p1.y - p2.y};
    return magnitude(diff);
}

let drawCircle = function(p: Point) {
    let c = <HTMLCanvasElement>document.getElementById("pointsCanvas");
    let ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.arc(p.x * c.width, p.y * c.height, 5, 0, 2*Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
}

let drawCorners = function(corners: MultiPoints) {
    let c = <HTMLCanvasElement>document.getElementById("pointsCanvas");
    let ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    for (let c of this.corners) {
        drawCircle(c);
    }
}

let moveCorner = function(p: Point, corners: MultiPoints): MultiPoints {
        console.log("Called Corners update", p);
        let minDist = 2;
        let minIndex = 0;
        for (let i in corners) {
            let dist = distance(p, corners[i]);
            if (dist < minDist) {
                minDist = dist;
                minIndex = Number(i);
            }
        }
        console.log(minIndex, minDist);
        corners[minIndex] = p;
        drawCorners(corners);
        return corners;
}

let setupCanvas = function() {
    let item = document.querySelector("#imgCanvas");
    $("#pointsCanvas").click(function(event) {
        let normCoords:Point = getElementNormCoords(item, event);
        console.log("Clicked: " + JSON.stringify(normCoords));
        corners = moveCorner(normCoords, corners);
    });
};

let setupKeyBindings = function() {
    document.addEventListener('keydown', function(event) {
        // Right arrow.
        if (event.keyCode == 39 &&  !appState.done) {
            appState.next();
        }
        // Left arrow.
        if (event.keyCode == 37 &&  !appState.done) {
            appState.prev();
        }
    });
}

let createOverlay = function() {
  let putURL = server
               + "/overlays"
               + '/quadrilateral_points';
  console.log('overlay url: ' + putURL);
  $.ajax({
      type: 'PUT',
      url: putURL,
      success: function(data) {
          console.log("overlay created");
      },
      error: function(data) {
          console.log("overlay exists");
      }
  });
}


let main = function() {
    console.log("Running main function");
    createOverlay();
    initialiseAppState();
    setupCanvas();
    drawCorners(corners);
    setupKeyBindings();
}

window.onload = main;
