var ev = {
  audioContext:undefined,
  
  init: (audioContext) => {
      console.log("ev loading");
      ev.audioContext=audioContext;
      
      function onError() {  }
      
      var cloudBtn = document.getElementById("evBtn1");
      cloudBtn.addEventListener('click', function(time) {
          ev.cloud();
        }, false);
        
      ev.get_sampleAsync('synthlead.wav').then( buffer => {
          console.log("Got buffer");
        });

      var pat = {
        'kick':{ s:'1000100100000100', c:'pink' }
      };
      Object.keys(pat).forEach( k => {  
          for(var beat=0; beat<16; beat++) {
            if(pat[k].s.substr(beat,1) |0) {
              document.getElementById(k+(beat+1)).style.backgroundColor=pat[k].c;
            }
          }
        });


    },
    
  get_sampleAsync: f => {
      return new Promise( (resolve, reject) => {
          var request = new XMLHttpRequest();
          request.open('GET', "./audio/"+f, true);
          request.responseType = 'arraybuffer';
          request.onload = _ => {
              ev.audioContext.decodeAudioData(request.response, arrayBuffer => {
                  resolve(arrayBuffer);
                }, e => {
                  console.log("Failed to download "+f);
                  reject();
                });
            };
          request.send();
        });
    },
    
  cloud: _ => {
      console.log("Cloud!");
      //var myOfflineAudio = new OfflineAudioContext(numOfChannels, length, sampleRate);      
      var myOfflineAudio = new OfflineAudioContext(2,44100*2,44100);   
     
      var kick_reg = ev.kick(myOfflineAudio);
      var kick_mix = ev.kick(myOfflineAudio, [0.2, 0.1]);
      
      myOfflineAudio.startRendering().then( renderedBuffer => {
          console.log('Rendering completed successfully', renderedBuffer.length);
            
          var playme = ev.audioContext.createBufferSource();
          playme.buffer = renderedBuffer;
          playme.connect(ev.audioContext.destination);
          playme.start();
        }).catch(function(err) {
            console.log('Rendering failed: ' + err);
            // Note: The promise should reject when startRendering is called a second time on an OfflineAudioContext
        });
        
      //ev.audioContext( );
      
    },
    
  kick: (ac, params) => {
    var time = 0.0;
    function param(i, v0, v1, def) {
      if( (!params) || typeof params[i] == undefined ) {
        return def;
      }
      return params[i]*v1+v0;
    }
    
    var o1f = param(0, 5,480, 120);
    var o2f = param(1, 5,480, 50);

    var osc = ac.createOscillator();
    var osc2 = ac.createOscillator();
    var gainOsc = ac.createGain();
    var gainOsc2 = ac.createGain();

    var output = ac.createGain();
    output.connect(ac.destination);
    //output.gain.value = 0;
    output.gain.value = 1;

    osc.type = 'triangle';
    osc2.type = 'sine';

    gainOsc.gain.setValueAtTime(1, time);
    gainOsc.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    //gainOsc.connect(audioContext.destination);
    
    gainOsc2.gain.setValueAtTime(1, time);
    gainOsc2.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    //gainOsc2.connect(audioContext.destination);
    
    osc.frequency.setValueAtTime(o1f, time);
    osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.5);
    
    osc2.frequency.setValueAtTime(o2f, time);

    //Connections
    osc.connect(gainOsc);
    osc2.connect(gainOsc2);
    gainOsc2.connect(output);
    gainOsc.connect(output);

    //output.gain.exponentialRampToValueAtTime(0.8, time + 0.2);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.9);
    osc2.stop(time + 0.9);

    return output;
  },
  
  
  
  last_entry:0
};
