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
    
  cloud: _=>{
      console.log("Cloud!");
    }
};
