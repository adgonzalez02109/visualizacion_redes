var svg = d3.select("#net_canvas"),
width = +svg.attr("width"),
height = +svg.attr("height");

var tooltip = d3.select("body")
.append("div")
.attr("class", "tooltip")
.style("opacity", 0);
var datos=[];
var tipos = ["Masculino","Femenino","Mixto","municipio"];
var types = d3.scaleOrdinal()
.domain(["Masculino","Femenino","Mixto","municipio"])
.range(["green","pink","gray","blue"]);
var medallas = d3.scaleOrdinal()
.domain(["ORO","BRONCE","PLATA"])
.range(["#F2B134","#ED553B","#068587"]);

var legends = d3.scaleOrdinal()
.domain(["municipio","","Mixto","Femenino","Masculino","Generos","PLATA","BRONCE","ORO","Medallas"])
.range(["blue","white","gray","pink","green","white","#068587","#ED553B","#F2B134","white"]);

legend(legends.domain(),legends);

var insumo_original={};
var link,node,links,nodes,simulation;
var linkedByIndex = {};
var enlace = "https://www.datos.gov.co/api/views/dg2n-xs4n/rows.csv?accessType=DOWNLOAD";
var enlace_tmp = "https://s3.us-east-2.amazonaws.com/testing.alvarod/miserables.json";
var nodes_t = {};
var muns = {};
function get_nodes(data){
  var nodes = [];
  nodes_t = {};
  var index = 0;
  var index_muns = 0;
  data.forEach(function(d,i,arr){
    if(typeof nodes_t[d.deporte+"_"+d.genero] == "undefined"){

      nodes.push({id:index, name:d.deporte+"_"+d.genero, value:d.deporte , type:d.genero});
      nodes_t[d.deporte+"_"+d.genero] = index;
      index++;
    }
    if(typeof nodes_t[d.municipio] == "undefined"){

      nodes.push({id:index , name:d.municipio, value:d.municipio , type:"municipio"});
      nodes_t[d.municipio] = index;
      muns[d.municipio] = index_muns++;
      index++;
    }

  });

  return nodes;
}
function get_links(data){
  var links = [];
  var links_t = {};
  data.forEach(function(d,i,arr){
    if(typeof links_t["s_"+d.deporte+"_"+d.genero+"_t_"+d.municipio] == "undefined"){
      links.push({source:nodes_t[d.deporte+"_"+d.genero], target:nodes_t[d.municipio] , value:d.medalla});
      links_t["s_"+d.deporte+"_"+d.genero+"_t_"+d.municipio] = 1;
    }

  });


  return links;
}
function inputted() {
  simulation.force("link").strength(+this.value);
  simulation.alpha(1).restart();
}
d3.csv(enlace)
.then(function(data){

  insumo_original = data;
  nodes = get_nodes(data);//data.nodes;
  
  links = get_links(data);


  simulation = d3.forceSimulation(nodes)
  .force("charge", d3.forceManyBody().strength(-200))
  .force("link", d3.forceLink(links).distance(300))
 .force("x", d3.forceX())
 .force("y", d3.forceY(function(d){var fx = 100; (d.type == "municipio")? fx = 0:(d.type=="Femenino" || d.type=="Mixto")?fx = 800:fx = 800; return fx}))
  .on("tick", ticked);



  var g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 6 + ")");
  link = g.append("g").attr("stroke", "#000").attr("stroke-width", 1.5).selectAll(".link"),
  node = g.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5).selectAll(".node");
  svg.on("click",svgClickFunction);
  restart();
});


function restart() {

  // Apply the general update pattern to the nodes.
  node = node.data(nodes, function(d) { return d.id;});

  node.exit().transition()
  .attr("r", 0)
  .remove();

  node = node.enter().append("circle")
  .call(function(node) { node.transition().attr("r", 6); })
  .merge(node);

  node.attr("fill", function(d) { return types(d.type); })
  .attr("fx",12);
  
  node
  .on('mouseover.tooltip', function(d) {
    tooltip.transition()
    .duration(300)
    .style("opacity", .95);
    tooltip.html(d.value+" - "+d.type )
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY + 10) + "px");
  })
  .on("mouseout.tooltip", function() {
    tooltip.transition()
    .duration(300)
    .style("opacity", 0);
  })
  .on("mousemove", function() {
    tooltip.style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY + 10) + "px");
  })
  .on("click", clickFunction);

  node.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged));

  // Apply the general update pattern to the links.
  link = link.data(links, function(d) { return d.source.id + "-" + d.target.id; });

  // Keep the exiting links connected to the moving remaining nodes.
  link.exit().transition()
  .attr("stroke-opacity", 0)
  .attrTween("x1", function(d) { return function() { return d.source.x; }; })
  .attrTween("x2", function(d) { return function() { return d.target.x; }; })
  .attrTween("y1", function(d) { return function() { return d.source.y; }; })
  .attrTween("y2", function(d) { return function() { return d.target.y; }; })
  .remove();

  link = link.enter().append("line")
  .call(function(link) { link.transition().attr("stroke-opacity", .3).attr("stroke", function(d) { return medallas(d.value); })
    ; })
  .merge(link);

  // Update and restart the simulation.
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();

  linkedByIndex={};
  links.forEach((d) => {
    console.log(d.source)
    linkedByIndex[`${d.source.index},${d.target.index}`] = true;
  });
}
function dragstarted() {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d3.event.subject.fx = d3.event.subject.x;
  d3.event.subject.fy = d3.event.subject.y;
}

function dragged() {
  d3.event.subject.fx = d3.event.x;
  d3.event.subject.fy = d3.event.y;
}

function dragended() {
  if (!d3.event.active) simulation.alphaTarget(0);
  d3.event.subject.fx = null;
  d3.event.subject.fy = null;
}
function ticked() {

  var count = 0;
for (var k in muns) {
    if (muns.hasOwnProperty(k)) {
       ++count;
    }
}
  node.attr("cx", function(d) {if(d.type == "municipio"){
    return d.x = -((count/2)*30)+40+(muns[d.name]*30);
  }else{
    return d.x = Math.max(-(width/2)+6, Math.min((width/2) - 6, d.x)); 
  }
  })
  .attr("cy", function(d) {if(d.type == "municipio"){
    return d.y = 5;
  }else{
    return d.y=Math.max(-(height/6)+6, Math.min((height/2) - 6, d.y)); 
  }
  }
  )

  link.attr("x1", function(d) { return d.source.x; })
  .attr("y1", function(d) { return d.source.y; })
  .attr("x2", function(d) { return d.target.x; })
  .attr("y2", function(d) { return d.target.y; });
}

function isConnected(a, b) {
  console.log("a ver como es...",a.index,b.index, linkedByIndex[`${a.index},${b.index}`])
  return isConnectedAsTarget(a, b) || isConnectedAsSource(a, b) || a.index === b.index;
}

function isConnectedAsSource(a, b) {
  return linkedByIndex[`${a.index},${b.index}`];
}

function isConnectedAsTarget(a, b) {
  return linkedByIndex[`${b.index},${a.index}`];
}

function isEqual(a, b) {
  return a.index === b.index;
}

function clickFunction (d) {
  const circle = d3.select(this);
  d3.event.stopPropagation();

  node
  .transition(500)
  .style('opacity', o => {
    const isConnectedValue = isConnected(o, d);
    if (isConnectedValue ) {
      return .9;
    }
    return 0.2
  })
  .style('fill-opacity', (o) => {
    const isConnectedValue = isConnected(o, d);
    if (isConnectedValue) {
      return .9;
    }
    return 0.2
  });

  link
  .transition(500)
  .style('stroke-opacity', o => (o.source === d || o.target === d ? 1 : 0.03));

  
}
function svgClickFunction() {
  console.log("SVGclickFunction")

  node
  .transition(500)
  .style('opacity',.9)
  .style('fill-opacity',.9);

  link
  .transition(500)
  .style("stroke-opacity", .3);

  console.log("SVGclickFunction22")
}
function legend(data,c){



  var svg2 = d3.select("#legend").append("svg")
  .attr("width", 180)
  .attr("height", 500)
  .append("g")
  .attr("transform", "translate(" + (-50) + "," + 400 + ")");


  var legend = svg2.selectAll(".legend")
  .data(data)
  .enter().append("g")
  .attr("class", "legend")
  .attr("transform", function(d, i) { return "translate( -150 ," + (-1*((i+1)*30)) + ")"; });



  legend.append("rect")
  .attr("x", 200)
  .attr("y", 30)
  .attr("width", 300)
  .attr("height", 25)
  .style("fill", function(d){
    return c(d)
  })
  .attr("opacity",d=> (d=="municipio")?1:.3)
  .on("click",function(d){
    var modifica = true;
    if(d == "municipio" || d == "Medallas" || d == "Generos" || d == ""){
      
      datos = insumo_original;
    }else if(medallas.domain().includes(d)){
      datos = insumo_original.filter(h=>h.medalla == d);
    }else if(tipos.includes(d)){
      datos = insumo_original.filter(h=> h.genero == d);
    }
    nodes = get_nodes(datos);

    links = get_links(datos);
    restart();
});
    var texto_legend = legend.append("text")
  .attr("x", 220 )
  .attr("y", 40)
  .attr("dy", ".30em")
  .style("text-anchor", "begin")
  .attr("fill",d=> (d=="municipio")?"white":"black")
  .text(function(d) { return d; });


}