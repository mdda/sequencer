var ev = {
  init: (audioContext) => {
      console.log("ev loaded");
      
      function onError() {  }
      
      var get_sampleAsync = (f => {
          return new Promise( (resolve, reject) => {
              var request = new XMLHttpRequest();
              request.open('GET', "./audio/"+f, true);
              request.responseType = 'arraybuffer';
              request.onload = _ => {
                  audioContext.decodeAudioData(request.response, arrayBuffer => {
                      resolve(arrayBuffer);
                    }, e => {
                      console.log("Failed to download "+f);
                      reject();
                    });
                };
              request.send();
            });
        });
 
      get_sampleAsync('synthlead.wav').then( buffer => {
          console.log("Got buffer");
        });
    }  
};
