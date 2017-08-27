//скрипт добавления ховера к свг изображению
//в результате выполения скрипта в указанной директории
//для каждого .svg файла создается файл с именем старый_файл_hover.svg,
//содеражащий изображение и ховер
//скрипт предполагает, что все содержимое внутри свг помещено в одну группу
//использование
// node.js index.js folder filterName
// folder - директория с svg файлами
// filterName - опциональный параметр, имя фильтра из файла filter.js

"use strict";

var fs  = require("fs"),
	xml2js = require('xml2js'),
	parser = new xml2js.Parser(),
	builder = new xml2js.Builder(),
	filters = require("./filter.js");

function readdirAsync(path){
	return new Promise( (resolve,reject) => {
		fs.readdir (path, (err,result) => {
			if (err){
				reject(err);
			}
			resolve(result);
		});
	});
};
function readFileAsync(path){
	return new Promise( (resolve,reject) => {
		fs.readFile (path, (err,result) => {
			if (err){
				reject(err);
			}
			resolve(result);
		});
	});
};
function writeFileAsync(path,data){
	return new Promise( (resolve,reject) => {
		fs.writeFile(path, data, (err,result) => {
			if (err){
				reject(err);
			}
			resolve();
		});
	});
};

function parseXMLAsync(data){
	return new Promise(function (resolve,reject){
		parser.parseString(data,function(err,result){
			if (err){
				reject(err);
			}
			resolve(result);
		});
	});
};

function parseAllAsync(data,filter){
	return Promise.all([parseXMLAsync(data),parseXMLAsync(filter)])
}

function addHover(parseRes){
	let main = parseRes[0],
		filter = parseRes[1],
		viewBox =  main["svg"].$["viewBox"],
		newBox = viewBox.split(" "),
		width = main["svg"].$["width"] || parseInt(newBox[2]),
		use = {},
		id = '';

	//изменить ширину свг
	newBox[2] = width * 2
	main["svg"].$["width"] = newBox[2];
	main["svg"].$["viewBox"] = newBox.join(" ");

	//обернуть содержимое свг в группу
	let wrapped = clone_(main["svg"]);
	wrapped.$ = {"id":"__common"}
	main["svg"] = {"$":main.svg.$}
	main["svg"]["g"] = wrapped

	//добавить описание фильтра
	main["svg"]["defs"] = filter["defs"];

	//добавить ховер
	main["svg"]["use"] = getUseAttr_(width)

	let xml = builder.buildObject(main);
	return xml;
};

function processOneFile(fname,filter){
	return new Promise((resolve, reject) => {
		let newName = fname.replace(".svg","_hover.svg");
		readFileAsync(fname)
			.then(data => parseAllAsync(data,filter))
			.then(result => addHover(result), err => console.log(err))
			.then(result => writeFileAsync(newName,result))
			.then(() => {
				console.log(`${fname} processed`)
				resolve();},
			err => console.log(err));
		});
};

function getUseAttr_(width){
	return {
		'$':{
			"xlink:href":"#__common",
			"id":"hover",
			"filter":"url(#colorChange)",
			"transform":`translate(${width})`
			}
	};
};

function clone_(a) {
   return JSON.parse(JSON.stringify(a));
}

(function main(){

	let dirName = process.argv[2],
		filter = filters[process.argv[3]] || filters["grayscale"]
	if (!dirName){
		throw new Error("Need to specify svg file name");
	};

	readdirAsync(dirName)
		.then( (data) => {
			return Promise.all(
				data
					.filter((fname)=>/\.svg/.test(fname))
					.map((fname) => processOneFile(`${dirName}/${fname}`,filter))
			)
		})
		.then(()=>console.log("Done"));

})();


