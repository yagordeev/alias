var words = [];
var record = 0;
var minutes = 2;
// var seconds = 3;
var seconds = $('#timerNumber').text();
var pass = $('#pass').text();

$('.gameBtn').on('click', function() {
	$(this).addClass('active');
	setTimeout(function() {
		$('.gameBtn').removeClass('active');
	}, 200);
});
$('.ckeckList').on('click', function() {
	$(this).toggleClass('opacity');
});

$(document).ready(function() {
	$('#words>div').each(function() { words.push($(this).text()) });
	newNumber();
	countDown();
});

let newNumber = () => {
	const max = words.length;
	const random = Math.floor(Math.random() * Math.floor(max));
	finedWord(random);
	return random;
};

let finedWord = (random) => {
	const newWord = words[random];
	$('#thisWord').text(newWord);
	return newWord;
};

$('.deleteWord').on('click', function() {
	const deleteWord = ($('#thisWord').text()).trim();
	const deleteWords = ($('#deleteWord').val()).trim();
	if(!deleteWords) {
		$('#deleteWord').val(deleteWord);
		newNumber();
	} else {
		$('#deleteWord').val(deleteWords + ', ' + deleteWord);
		console.log(deleteWords + ', ' + deleteWord);
		newNumber();
	}
});

$('#yes').on('click', function() {
	if(seconds > 0) {
		record++;
		$('#record').text(record);
		$('#thisRecord').val(record);
		let thisWord = $('#thisWord').text();
		const newWords = words.filter((detete) => !thisWord.includes(detete));
		words = newWords;
		newNumber();
	} else {
		record++;
		$('#record').text(record);
		$('#thisRecord').val(record);
		$('#gameZone').addClass('hidden');
		$('#nextPlayer').removeClass('hidden');
		if($('#NP').val() == '') {
			$('#nextPlayer').submit();
		};
	};
});

$('#no').on('click', function() {
	if(seconds > 0) {
		if(pass == 'checked') {
			record--;
		};
		$('#record').text(record);
		$('#thisRecord').val(record);
		let thisWord = $('#thisWord').text();
		const newWords = words.filter((detete) => !thisWord.includes(detete));
		words = newWords;
		newNumber();
	} else {
		if(pass == 'checked') {
			record--;
		};
		$('#record').text(record);
		$('#thisRecord').val(record);
		$('#gameZone').addClass('hidden');
		$('#nextPlayer').removeClass('hidden');
		if($('#NP').val() == '') {
			$('#nextPlayer').submit();
		};
	};
});

function countDown() {
	if(seconds > 0) {
		seconds--;
		h = seconds / 3600 ^ 0,
			m = (seconds - h * 3600) / 60 ^ 0,
			s = seconds - h * 3600 - m * 60,
			time = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
		$("#timer").text(', осталось: ' + time);
	} else {
		$("#timer").text(', время вышло!');
		return;
	}
	setTimeout(function() {
		countDown();
	}, 1000);
}