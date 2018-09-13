const YouTube = require('simple-youtube-api');
const youtube = new YouTube('AIzaSyCL3kqBqY16xPRn1emc7NiBJok-5ptiZfE');
const Discord = require ("discord.js");
const client = new Discord.Client()
const ytdl = require('ytdl-core');
const queue = new Map();

var servers = {};
var prefix = ';';
client.on('message', message =>{
    if(message.content == `<@489933128442314753>`){
      message.reply(`Para saber meus comandos use o comando ;ajuda !`)
      }
});
client.on("message", async message => {
    var args = message.content.substring(prefix.length).split(" ");
    if (!message.content.startsWith(prefix)) return;
  var searchString = args.slice(1).join(' ');
	var url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	var serverQueue = queue.get(message.guild.id);
    switch (args[0].toLowerCase()) {
      case "tocar":
    var voiceChannel = message.member.voiceChannel;
		if (!voiceChannel) return message.channel.send('Me desculpe, mas você precisa estar em um canal de voz para tocar música!');
		var permissions = voiceChannel.permissionsFor(message.client.user);
		if (!permissions.has('CONNECT')) {
			return message.channel.send('Não consigo me conectar ao seu canal de voz, verifique se tenho as permissões adequadas!');
		}
		if (!permissions.has('SPEAK')) {
			return message.channel.send('Eu não posso falar neste canal de voz, verifique se eu tenho as permissões adequadas!');
		}
      if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			var playlist = await youtube.getPlaylist(url);
			var videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				var video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return message.channel.send(`✅ Lista de reprodução: **${playlist.title}** foi adicionado à fila!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 10);
					var index = 0;
					message.channel.send(`
__**Seleção de músicas:**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
selecione um dos resultados da pesquisa que vão de 1 a 10.
					`);
					// eslint-disable-next-line max-depth
					try {
						var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return message.channel.send('Você não selecionou nenhuma música, cancelando a seleção de vídeo.');
					}
					var videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return message.channel.send('🆘 Não consegui obter nenhum resultado de pesquisa.');
				}
			}
			return handleVideo(video, message, voiceChannel);
		}
        break;
      case "pular":
		if (!message.member.voiceChannel) return message.channel.send('Você não está em um canal de voz!');
		if (!serverQueue) return message.channel.send('Não há nenhuma música que eu poderia pular para você.');
		serverQueue.connection.dispatcher.end('O comando pular foi usado!');
		return undefined;
        break;
      case "parar":
		if (!message.member.voiceChannel) return message.channel.send('Você não está em um canal de voz!');
		if (!serverQueue) return message.channel.send('Não há nada que eu possa fazer para você.');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('O comando de parar foi usado!');
		return undefined;
break;
      case "volume":
		if (!message.member.voiceChannel) return message.channel.send('Você não está em um canal de voz!');
		if (!serverQueue) return message.channel.send('Não há nada tocando.');
		if (!args[1]) return message.channel.send(`O volume atual é: **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return message.channel.send(`Eu ajustei o volume para: **${args[1]}**`);
break;
      case "tocando":
		if (!serverQueue) return message.channel.send('Não há nada tocando.');
		return message.channel.send(`🎶 Agora tocando: **${serverQueue.songs[0].title}**`);
break;
      case "playlist":
		if (!serverQueue) return message.channel.send('Não há nada tocando.');
		return message.channel.send(`
__**Fila de músicas:**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Agora tocando:** ${serverQueue.songs[0].title}
		`);
break;
      case "pausar":
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return message.channel.send('⏸ c');
		}
		return message.channel.send('Não há nada tocando.');
break;
      case "resumir":
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return message.channel.send('▶ Resumiu a música para você!');
		}
		return message.channel.send('Não há nada tocando.');
	

	return undefined;
break;
case "ajuda":
	const ajuda = new Discord.RichEmbed()
		.setTitle("AJUDA")
		.setDescription("**Comandos de música**\n`;tocar <música ou link>` - Irá tocar uma música.\n`;pular` - Irá pular uma música.\n`;parar` - Irá excluir a playlist.\n`;tocando` - Irá mostrar a música que está tocando\n`;playlist` - Irá mostrar as músicas que estão na lista\n`;pausar` - Irá pausar a música.\n`;resumir` - Irá retomar uma música pausada")
		.setColor("#FFFFF")
		.setFooter("BattleSong - Todos os direitos reservados")
		message.channel.send(ajuda)
      case "tocar":
}

async function handleVideo(video, message, voiceChannel, playlist = false) {
	var serverQueue = queue.get(message.guild.id);
	console.log(video);
	var song = {
		id: video.id,
		title: video.title,
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		var queueConstruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(message.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(message.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`Eu não pude entrar no canal de voz: ${error}`);
			queue.delete(message.guild.id);
			return message.channel.send(`Eu não pude entrar no canal de voz: ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return message.channel.send(`✅ **${song.title}** foi adicionado à fila!`);
	}
	return undefined;
}
  function play(guild, song) {
	var serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
      message.channel.send('`` A música que estava tocando acabou``');
			if (reason === 'Stream is not generating quickly enough.') console.log('Música terminada.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`🎶 Começa a tocar agora: **${song.title}**`)
}
});

client.login(process.env.Betis);