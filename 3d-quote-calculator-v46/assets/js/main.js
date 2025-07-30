// Import dependencies
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/orbitcontrols';
import { STLLoader } from 'three/addons/stlloader';
import $ from 'jquery';

// Global state
let stlq_mesh = null;

const scriptTag = document.getElementById('wp-script-module-data-stlq-main');
let stlqConfig = {};
if (scriptTag?.textContent) {
    try {
        stlqConfig = JSON.parse(scriptTag.textContent);
    } catch (e) {
        console.warn('Failed to parse stlq-main config:', e);
    }
}

// Wait for DOM ready
$(function() {

  // Populate color choices from settings
  if (stlqConfig?.colors) {
    const container = $('#stlq_color_choices');
    container.empty();
    stlqConfig.colors.forEach(c => {
      const btn = $('<div class="color-choice"></div>').css('background-color', c.trim());
      btn.on('click', function() {
        $('.color-choice').removeClass('selected');
        $(this).addClass('selected');
        $('#stlq_color').val(c.trim());
        if (stlq_mesh) {
          stlq_mesh.material.color.set(c.trim());
        }
      });
      container.append(btn);
    });
    if (!$('#stlq_color').length) {
      $('<input type="hidden" id="stlq_color" />')
        .appendTo('#stlq_widget')
        .val(stlqConfig.colors[0].trim());
    }
  }

  $('#stlq_submit').text(stlqConfig.submitLabel);
  if ($('#stlq_file').length && !$('.stlq-upload-label').length) {
    $('#stlq_file').after('<label for="stlq_file" class="stlq-upload-label">'+stlqConfig.uploadLabel+'</label>');
    $('#stlq_file').hide();
  }
  $('#stlq_submit').css({
    'background-color': stlqConfig.submitBg,
    'color': stlqConfig.submitText
  });
  $('.stlq-upload-label').css({
    'background-color': stlqConfig.uploadBg,
    'color': stlqConfig.uploadText,
    'padding': '0.5em 1em',
    'border-radius': '4px',
    'cursor': 'pointer',
    'display': 'inline-block',
    'margin-bottom': '1em'
  });

  // Widget font color
  $('#stlq_widget').css('color', '#000');

  // Update infill label
  $('#stlq_infill').on('input', function(){
    $('#stlq_infill_val').text(this.value);
  });

  // Handle form submission
  $('#stlq_submit').on('click', function() {
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

    // Show progress bar
    $('#stlq_progress').show();
    $('#stlq_bar').css('width', '0%');
    $('#stlq_bar').animate({width: '50%'}, 200);
    setTimeout(() => {
      $('#stlq_bar').animate({width: '90%'}, 2000);
    }, 200);

    $('#stlq_result').show();
    renderSTLPreview(file);

    // AJAX call
    $.ajax({
      url: stlqConfig.apiurl + '/slice',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false
    }).done(function(res) {
      $('#stlq_bar').stop().animate({width: '100%'}, 200);
      setTimeout(() => {
        $('#stlq_progress').hide();
        $('#stlq_price').text('Price: €' + res.costs.total_cost.toFixed(2));
        if (stlqConfig.useWoo) {
          renderWooButton(res.costs.total_cost);
        } else {
          renderPayPalButton(res.costs.total_cost);
        }
      }, 300);
    }).fail(function(err) {
      $('#stlq_progress').hide();
      alert('Error: ' + (err.responseJSON?.detail || err.statusText));
    });
  });

  // 3D preview
  function renderSTLPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const container = document.getElementById('stlq_3d');
      container.innerHTML = '';
      const width = container.clientWidth;
      const height = container.clientHeight;
      const scene = new THREE.Scene();
      const renderer = new THREE.WebGLRenderer({antialias:true});
      renderer.setSize(width, height);
      renderer.setClearColor(0xffffff, 1);
      container.appendChild(renderer.domElement);

      const camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
      camera.position.set(0,0,150);

      scene.add(new THREE.AmbientLight(0xffffff,0.6));
      const dl = new THREE.DirectionalLight(0xffffff,0.8);
      dl.position.set(0,50,100);
      scene.add(dl);

      scene.add(new THREE.AxesHelper(250));
      scene.add(new THREE.GridHelper(250,10));

      const loader = new STLLoader();
      const geom = loader.parse(e.target.result);
      geom.computeBoundingBox();

      const center = geom.boundingBox.getCenter(new THREE.Vector3());
      stlq_mesh = new THREE.Mesh(
        geom,
        new THREE.MeshLambertMaterial({color: new THREE.Color($('#stlq_color').val()||'#888888')})
      );
      stlq_mesh.position.sub(center);
      scene.add(stlq_mesh);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.minDistance = 20;
      controls.maxDistance = 500;

      (function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      })();
    };
    reader.readAsArrayBuffer(file);
  }

  // PayPal checkout
  function renderPayPalButton(amount) {
    if (typeof paypal === 'undefined') return;
    paypal.Buttons({
      createOrder: (d,a) => a.order.create({purchase_units:[{amount:{value:amount.toFixed(2)}}]}),
      onApprove: (d,a) => a.order.capture().then(dt => alert('Transaction by '+dt.payer.name.given_name))
    }).render('#stlq_paypal');
  }

  // WooCommerce add to cart
  function renderWooButton(amount) {
    const btn = $('<button>Add to Cart</button>').appendTo('#stlq_paypal');
    btn.on('click', () => {
      $.post({
        url: '/wp-admin/admin-ajax.php?action=stlq_add_to_cart',
        data: {price: amount}
      }).done(res => alert('Added! Total: '+res.data.cart_total));
    });
  }
});
