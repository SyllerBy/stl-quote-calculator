
// Dynamic customization of button texts and colors
jQuery(function($){

// Populate color choices from settings
if (stlq_vars.colors) {
  const container = $('#stlq_color_choices');
  container.empty();
  stlq_vars.colors.forEach(c => {
    const btn = $('<div class="color-choice"></div>').css('background-color', c.trim());
    btn.on('click', function(){
      $('.color-choice').removeClass('selected');
      $(this).addClass('selected');
      $('#stlq_color').val(c.trim());
      // Update mesh color in preview if exists
      if(window.stlq_mesh){
        window.stlq_mesh.material.color.set(c.trim());
      }
    });
    container.append(btn);
  });
  // hidden input to store selected color
  if(!$('#stlq_color').length){
    $('<input type="hidden" id="stlq_color" />').appendTo('#stlq_widget').val(stlq_vars.colors[0].trim());
  }
}

  $('#stlq_submit').text(stlq_vars.submitLabel);
  if ($('#stlq_file').length && !$('.stlq-upload-label').length) {
    $('#stlq_file').after('<label for="stlq_file" class="stlq-upload-label">'+stlq_vars.uploadLabel+'</label>');
    $('#stlq_file').hide();
  }
  $('#stlq_submit').css({
    'background-color': stlq_vars.submitBg,
    'color': stlq_vars.submitText
  });
  $('.stlq-upload-label').css({
    'background-color': stlq_vars.uploadBg,
    'color': stlq_vars.uploadText,
    'padding': '0.5em 1em',
    'border-radius': '4px',
    'cursor': 'pointer',
    'display': 'inline-block',
    'margin-bottom': '1em'
  });
});

jQuery(function($){

// Populate color choices from settings
if (stlq_vars.colors) {
  const container = $('#stlq_color_choices');
  container.empty();
  stlq_vars.colors.forEach(c => {
    const btn = $('<div class="color-choice"></div>').css('background-color', c.trim());
    btn.on('click', function(){
      $('.color-choice').removeClass('selected');
      $(this).addClass('selected');
      $('#stlq_color').val(c.trim());
      // Update mesh color in preview if exists
      if(window.stlq_mesh){
        window.stlq_mesh.material.color.set(c.trim());
      }
    });
    container.append(btn);
  });
  // hidden input to store selected color
  if(!$('#stlq_color').length){
    $('<input type="hidden" id="stlq_color" />').appendTo('#stlq_widget').val(stlq_vars.colors[0].trim());
  }
}

  // Widget font color
  $('#stlq_widget').css('color', '#000');

  // Update infill label
  $('#stlq_infill').on('input', function(){
    $('#stlq_infill_val').text(this.value);
  });

  // Handle form submission
  $('#stlq_submit').on('click', function(){
    const fileInput = $('#stlq_file')[0];
    if (!fileInput.files.length) {
      alert('Veuillez sélectionner un fichier STL.');
      return;
    }
    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('material_id', $('#stlq_material').val());
    formData.append('infill', $('#stlq_infill').val());

    // Show and animate progress bar (fast then slow)
    $('#stlq_progress').show();
    $('#stlq_bar').css('width','0%');
    // Phase1: to 50%
    $('#stlq_bar').animate({width:'50%'}, 200);
    // Phase2: slow creep to 90%
    setTimeout(()=>{
      $('#stlq_bar').animate({width:'90%'}, 2000);
    }, 200);

    // AJAX call
    $.ajax({
      url: stlq_vars.apiurl + '/slice',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false
    }).done(function(res){
      // complete bar
      $('#stlq_bar').stop().animate({width:'100%'}, 200);
      setTimeout(()=>{
        $('#stlq_progress').hide();
        // show price
        $('#stlq_price').text('Price: €' + res.costs.total_cost.toFixed(2));
        // preview + checkout
        $('#stlq_result').show();
        renderSTLPreview(file);
        if(stlq_vars.useWoo){
          renderWooButton(res.costs.total_cost);
        } else {
          renderPayPalButton(res.costs.total_cost);
        }
      },300);
    }).fail(function(err){
      $('#stlq_progress').hide();
      alert('Error: ' + (err.responseJSON?.detail || err.statusText));
    });
  });

  // 3D preview
  function renderSTLPreview(file){
    const reader = new FileReader();
    reader.onload = function(e){
      const container = document.getElementById('stlq_3d');
      container.innerHTML = '';
      const width = container.clientWidth;
      const height = container.clientHeight;
      // Scene
      const scene = new THREE.Scene();
      // White background
      const renderer = new THREE.WebGLRenderer({antialias:true});
      renderer.setSize(width,height);
      renderer.setClearColor(0xffffff,1);
      container.appendChild(renderer.domElement);
      // Camera
      const camera = new THREE.PerspectiveCamera(75,width/height,0.1,1000);
      camera.position.set(0,0,150);
      // Lights
      scene.add(new THREE.AmbientLight(0xffffff,0.6));
      const dl = new THREE.DirectionalLight(0xffffff,0.8);
      dl.position.set(0,50,100);
      scene.add(dl);
      // Helpers
      scene.add(new THREE.AxesHelper(250));
      scene.add(new THREE.GridHelper(250,10));
      // Geometry
      const loader = new THREE.STLLoader();
      const geom = loader.parse(e.target.result);
      geom.computeBoundingBox();
      // center
      const center = geom.boundingBox.getCenter(new THREE.Vector3());
      const mesh = new THREE.Mesh(
        geom,
        new THREE.MeshLambertMaterial({color: new THREE.Color($('#stlq_color').val()||'#888888')})
      );
      mesh.position.sub(center);
      scene.add(mesh);
      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping=true;
      controls.dampingFactor=0.1;
      controls.minDistance=20;
      controls.maxDistance=500;
      // Animate
      (function animate(){
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene,camera);
      })();
    };
    reader.readAsArrayBuffer(file);
  }

  // PayPal checkout
  function renderPayPalButton(amount){
    if(typeof paypal==='undefined')return;
    paypal.Buttons({
      createOrder:(d,a)=>a.order.create({purchase_units:[{amount:{value:amount.toFixed(2)}}]}),
      onApprove:(d,a)=>a.order.capture().then(dt=>alert('Transaction by '+dt.payer.name.given_name))
    }).render('#stlq_paypal');
  }

  // WooCommerce add to cart
  function renderWooButton(amount){
    const btn = $('<button>Add to Cart</button>').appendTo('#stlq_paypal');
    btn.on('click',()=>{
      $.post({
        url:'/wp-admin/admin-ajax.php?action=stlq_add_to_cart',
        data:{price:amount}
      }).done(res=>alert('Added! Total: '+res.data.cart_total));
    });
  }
});
