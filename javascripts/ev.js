var ev = {
  audioContext:undefined,
  
  init: (audioContext) => {
      console.log("ev loading");
      ev.audioContext=audioContext;
      
      function onError() {  }
      
      var cloudBtn = document.getElementById("evBtn1");
      cloudBtn.addEventListener('click', _ => {
          ev.cloud();
        }, false);
        
      ev.get_sampleAsync('synthlead.wav').then( buffer => {
          console.log("Got buffer");
        });

      var pat = {
        'kick': { s:'1000100100000100', c:'pink' },
        'snare':{ s:'1000000000000000', c:'lightskyblue' }
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
      //console.log("Cloud!");
      
      //var myOfflineAudio = new OfflineAudioContext(numOfChannels, length, sampleRate); 
      var max_length_in_secs=1.0, sampleRate=44100;
           
      var kick_reg_ctx = new OfflineAudioContext(1,sampleRate*max_length_in_secs,sampleRate);        
      var kick_reg = ev.kick(kick_reg_ctx);
      
      var kick_new_ctx = new OfflineAudioContext(1,sampleRate*max_length_in_secs,sampleRate);        
      //var kick_new = ev.kick(kick_new_ctx, [0.2, 0.1]);
      var kick_new = ev.kick(kick_new_ctx, [0.45, 0.25]);
      
      function bufferAsync( ctx ) {
        return ctx.startRendering().then( renderedBuffer => {
            //console.log('Rendering completed successfully', renderedBuffer.length);
            return renderedBuffer;
          }).catch(function(err) {
            console.log('Rendering failed: ' + err);
            // Note: The promise should reject when startRendering is called a second time on an OfflineAudioContext
          });
      }
      //renderAsync( ev.kick(myOfflineAudio, [0.2, 0.1]) ). then 

      function playAsync( offsetTime ) {
        return  renderedBuffer => {
          if(true){
            var playme = ev.audioContext.createBufferSource();
            playme.buffer = renderedBuffer;
            playme.connect(ev.audioContext.destination);
            playme.start(ev.audioContext.currentTime + offsetTime);
          }
          return renderedBuffer;
        };
      }
      
      // do some kind of FFT analysis
      var fft_len = 2048; // 44100/20 ~ 2205
      var fft = new FFT(fft_len, sampleRate);

      function toSignature( renderedBuffer ) {
        //console.log(renderedBuffer);
        var data = renderedBuffer.getChannelData(0), data_len=renderedBuffer.length;
        
        var spectrum_overall=[];
        
        var offset_step = 32;
        for(var window_offset=0; window_offset+fft_len<data_len; window_offset+=offset_step, offset_step*=2) {
          fft.forward( data.slice(window_offset, window_offset+fft_len) );
          var spectrum = fft.spectrum;
          //console.log(spectrum);
          
          var freq_step=1.0;
          for(var freq=0.0; freq<fft_len/2; freq+=freq_step, freq_step*=1.1) {
            spectrum_overall.push( spectrum[ freq|0 ] || 0.0 );  // indices need to be integer, some spectrum entries 'undefined'
          }
          spectrum=undefined;
        }
        
        // Find absolute max in signature_overall
        var max=spectrum_overall[0];
        for(var i=1; i<spectrum_overall.length; i++) {
          max = (spectrum_overall[i]>max)?spectrum_overall[i]:max;
        }
        //console.log("spectrum_overall.max="+max);
        //console.log("spectrum_overall=", spectrum_overall);
        
        // in-place normalization of the signature
        for(var i=0; i<spectrum_overall.length; i++) {
          spectrum_overall[i] /= max;
        }
        
        return spectrum_overall;
      }
      
      var kick_reg_signature=undefined;
      
      function toL2error(signature) {
        //console.log(sig.length);
        //var kick_new_signature = sig; 
        
        var tot=0.0;
        for(var i=0; i<signature.length; i++) {
          var v=signature[i]-kick_reg_signature[i];
          tot += v*v;
        }
        return tot;
      }
      
      
      bufferAsync( kick_reg_ctx )
        .then( playAsync(0.0) )
        .then( toSignature )
        .then( sig => {
          console.log(sig.length);
          kick_reg_signature = sig; 
          
          return bufferAsync( kick_new_ctx );
          //return bufferAsync( kick_reg_ctx );
        })
        .then( playAsync(0.5) )
        .then( toSignature )
        .then( toL2error )
        .then( l2_error => {
          console.log("Firstl2 difference", l2_error);
        })
        .then( _ => {  // Let's try for a population
          var pop=[];
          for(var i=0; i<10; i++) {
            var params=[];
            for(var p=0; p<2; p++) {
              params.push( Math.random() );
            }
            pop.push({ score:undefined, params:params });
          }
          
          // Now let's evaluate all of them
          return Promise.all( pop.map( ind => {
                  var kick_ind_ctx = new OfflineAudioContext(1,sampleRate*max_length_in_secs,sampleRate);        
                  var kick_ind = ev.kick(kick_ind_ctx, ind.params);
                  return bufferAsync( kick_ind_ctx )
                    //.then( playAsync(0.5) )
                    .then( toSignature )
                    .then( toL2error );
                    
                }) // End of map
            )
            .then( pop_scores => {
              pop_scores.forEach( (s, i) => {
                  pop[i].score = s;
                }); 
                
              //console.log(pop);
              
              // find best (lowest L2) score in the population
              var best = pop.slice(1).reduce( (acc, ind) => { // don't need to consider first one
                  return (ind.score < acc.score) ? ind : acc;
                }, pop[0]); // since it's already here...
              
              console.log(best);
              
              var kick_ind_ctx = new OfflineAudioContext(1,sampleRate*max_length_in_secs,sampleRate);        
              var kick_ind = ev.kick(kick_ind_ctx, best.params);
              return bufferAsync( kick_ind_ctx )
                .then( playAsync(1.0) );
            })
            ;  
            
        });
        ;
        

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
