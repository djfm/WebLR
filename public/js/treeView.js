function Tree(targetSvgId)
{
	var canvas = d3.select('#'+targetSvgId)
	.append('g')
	.attr('transform', "translate(50, 50)");

	var tree = d3.layout.tree()
	.size([400, 400]);

	this.setData = function(data)
	{
		var nodes = tree.nodes(data);
		var links = tree.links(nodes);

		canvas.selectAll('.node').remove();
		canvas.selectAll('.link').remove();

		var node = canvas.selectAll('.node')
		.data(nodes)
		.enter()
		.append('g')
		.attr('class', 'node')
		.attr('transform', function(d){return "translate("+d.x+","+d.y+")";});

		node.append('circle')
		.attr('r', 5)
		.attr('fill', 'steelblue');

		node.append("text")
		.text(function(d){return d.name;});

		var diagonal = d3.svg.diagonal();

		canvas.selectAll('.link')
		.data(links)
		.enter()
		.append('path')
		.attr('class', 'link')
		.attr('fill', 'none')
		.attr('stroke', 'black')
		.attr('d', diagonal);
	};
}

Tree.removeMiddleNodes = function(tree, filter)
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