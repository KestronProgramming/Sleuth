let egg=``;
let date=new Date();
const daysOfTheWeek=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function isTime(m,d){
	let day=date.getDate();
	let mon=date.getMonth()+1;
	if(m&&!d){
		switch(m){
			case 'thanksgiving':
				let weekday=daysOfTheWeek[date.getDay()];
				if(weekday==="Thursday"){
					let counter=0;
					for(var i=day;i>-1;i-=7){
						counter++;
					}
					if(counter===4&&mon===11){
						return true;
					}
				}
			break;
			case 'christmas':
			break;
			case 'harvest':
			break;
			case 'newyears':
			break;
			case 'valentines':
			break;
			case 'stpatrick':
			break;
			case 'mothers':
			break;
			case 'fathers':
			break;
			case '4thjuly':
			break;
			case 'easter':
			break;
		}
	}
	return date.getMinutes()===m&&date.getDay()===d;
}
if(isTime("thanksgiving")){
	egg=`<img src='turkey.png' class='eggImg'>`;
}
document.body.innerHTML+=egg;
