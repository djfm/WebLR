function TreeView(targetSvgId)
{
	var canvas = d3.select('#'+targetSvgId)
	.append('g')
	.attr('transform', "translate(0, 50)");

	var tree = d3.layout.tree()
	.size([document.getElementById(targetSvgId).offsetWidth, 400]);

	this.setData = function(data)
	{
		var nodes = tree.nodes(data);
		var links = tree.links(nodes);

		canvas.selectAll('.node').remove();
		canvas.selectAll('.link').remove();

		var diagonal = d3.svg.diagonal();

		canvas.selectAll('.link')
		.data(links)
		.enter()
		.append('path')
		.attr('class', 'link')
		.attr('fill', 'none')
		.attr('stroke', 'black')
		.attr('d', diagonal);

		var node = canvas.selectAll('.node')
		.data(nodes)
		.enter()
		.append('g')
		.attr('class', function(d){return 'node '+d.type;})
		.attr('transform', function(d){return "translate("+d.x+","+d.y+")";});

		node.append('circle')
		.attr('r', function(d){
			return Math.min(10, 5*Math.sqrt(((d.children && d.children.length) || 1)));
		})
		.attr('fill', function(d){
			return (d.backgroundColor && d.backgroundColor()) || 'steelblue'; 
		});

		node.append("text")
		.text(function(d){return d.type === 'terminal' ?  d.name + " ("+d.value+")" : d.name;})
		.attr('transform', 'translate(10,0)');
	};
}

TreeView.removeMiddleNodes = function(tree, filter)
{
	var out = {};
	for(var i in tree)
	{
		if(i === 'children')
		{
			var children = [];
			for(var c in tree[i])
			{
				var child = Tree.removeMiddleNodes(tree[i][c], filter);
				if(
					(child.children && child.children.length === 1)
					&& (!filter || filter(child))
				)
				{
					children.push(child.children[0]);
				}
				else
				{
					children.push(child);
				}
			}
			out.children = children;
		}
		else
		{
			out[i] = tree[i];
		}
	}
	return out;
}