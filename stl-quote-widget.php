<?php
/**
 * Plugin Name: STL Quote Widget
 * Description: 3D printing quote widget with customizable buttons, Gutenberg & Elementor support.
 * Version: 4.0
 * Author: Anton GROGH
 */

if (!defined('ABSPATH')) exit;

// Enqueue frontend assets
function stlq_enqueue_assets() {
    wp_enqueue_style('stlq-style', plugin_dir_url(__FILE__) . 'assets/css/style.css', array(), '4.0');
    wp_enqueue_script('three-js', 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js', array(), '0.152.2', true);
    wp_enqueue_script('orbit-controls', plugin_dir_url(__FILE__) . 'assets/js/OrbitControls.js', array('three-js'), '0.152.2', true);
    wp_enqueue_script('stl-loader', plugin_dir_url(__FILE__) . 'assets/js/STLLoader.js', array('three-js'), '0.152.2', true);
    wp_enqueue_script('stlq-main', plugin_dir_url(__FILE__) . 'assets/js/main.js', array('jquery','three-js','orbit-controls','stl-loader'), '4.0', true);

    wp_localize_script('stlq-main', 'stlq_vars', array(
        'apiurl' => get_option('stlq_api_url', 'https://slicer.payen-shyrei.com'),
        'defaultColor' => get_option('stlq_default_color', '#888888'),
        'materials' => explode(',', get_option('stlq_materials', 'PLA,PETG,TPU')),
        'useWoo' => (bool) get_option('stlq_use_woo', false),
        'uploadLabel' => get_option('stlq_upload_label', 'Choose file'),
        'submitLabel' => get_option('stlq_submit_label', 'Get Quote & Preview'),
        'uploadBg' => get_option('stlq_upload_bg', '#f0f0f0'),
        'uploadText' => get_option('stlq_upload_text', '#000000'),
        'submitBg' => get_option('stlq_submit_bg', '#0073aa'),
        'submitText' => get_option('stlq_submit_text', '#ffffff'),
        'colors' => explode(',', get_option('stlq_colors', '#888888,#FF0000,#00FF00,#0000FF'))
    ));
}
add_action('wp_enqueue_scripts', 'stlq_enqueue_assets');

// Shortcode
function stlq_shortcode() {
    ob_start();
    include plugin_dir_path(__FILE__) . 'assets/html/app.html';
    return ob_get_clean();
}
add_shortcode('stl_quote_widget', 'stlq_shortcode');

// Gutenberg block
function stlq_register_block() {
    register_block_type(__DIR__ . '/');
}
add_action('init', 'stlq_register_block');

// Elementor widget
add_action('elementor/widgets/register', function($widgets_manager){
    class STLQ_Elementor_Widget extends \Elementor\Widget_Base {
        public function get_name() { return 'stlq_widget'; }
        public function get_title() { return 'STL Quote Widget'; }
        public function get_icon() { return 'eicon-cart-medium'; }
        public function get_categories() { return ['general']; }
        public function render() { echo do_shortcode('[stl_quote_widget]'); }
    }
    $widgets_manager->register(new STLQ_Elementor_Widget());
});

// WooCommerce AJAX add-to-cart
add_action('wp_ajax_stlq_add_to_cart', 'stlq_add_to_cart');
add_action('wp_ajax_nopriv_stlq_add_to_cart', 'stlq_add_to_cart');
function stlq_add_to_cart() {
    if (!class_exists('WC_Cart')) {
        wp_send_json_error('WooCommerce not available');
    }
    $price = floatval($_POST['price']);
    $product_id = wp_insert_post(array(
        'post_title' => 'Custom STL Print',
        'post_type' => 'product',
        'post_status' => 'publish',
        'meta_input' => array('_price' => $price, '_virtual' => 'yes', '_downloadable' => 'no')
    ));
    if ($product_id) {
        WC()->cart->add_to_cart($product_id);
        wp_send_json_success(array('cart_total' => WC()->cart->get_cart_total()));
    } else {
        wp_send_json_error('Failed to add to cart');
    }
}

// Admin settings
add_action('admin_menu', function() {
    add_menu_page(
        'STL Quote Settings',
        'STL Quote',
        'manage_options',
        'stlq-settings',
        'stlq_render_settings_page',
        'dashicons-admin-generic'
    );
});

add_action('admin_init', function() {
    register_setting('stlq_settings_group', 'stlq_api_url');
    register_setting('stlq_settings_group', 'stlq_default_color');
    register_setting('stlq_settings_group', 'stlq_materials');
    register_setting('stlq_settings_group', 'stlq_use_woo');
    register_setting('stlq_settings_group', 'stlq_upload_label');
    register_setting('stlq_settings_group', 'stlq_submit_label');
    register_setting('stlq_settings_group', 'stlq_upload_bg');
    register_setting('stlq_settings_group', 'stlq_upload_text');
    register_setting('stlq_settings_group', 'stlq_submit_bg');
    register_setting('stlq_settings_group', 'stlq_submit_text');
    register_setting('stlq_settings_group', 'stlq_colors');
});

function stlq_render_settings_page() { ?>
    <div class="wrap">
        <h1>STL Quote Widget Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('stlq_settings_group'); ?>
            <?php do_settings_sections('stlq_settings_group'); ?>

            <table class="form-table">
                <tr valign="top">
                    <th scope="row">API Endpoint URL</th>
                    <td><input type="text" name="stlq_api_url" value="<?php echo esc_attr(get_option('stlq_api_url', 'https://slicer.payen-shyrei.com')); ?>" style="width:400px;" /></td>
                </tr>

                <tr valign="top">
                    <th scope="row">Default Model Color</th>
                    <td><input type="color" name="stlq_default_color" value="<?php echo esc_attr(get_option('stlq_default_color', '#888888')); ?>" /></td>
                </tr>

                <tr valign="top">
                    <th scope="row">Materials (comma separated)</th>
                    <td><input type="text" name="stlq_materials" value="<?php echo esc_attr(get_option('stlq_materials', 'PLA,PETG,TPU')); ?>" style="width:400px;" />
                    <p class="description">Add materials separated by commas (e.g., PLA,PETG,TPU).</p></td>
                </tr>

                <tr valign="top">
                    <th scope="row">Use WooCommerce for Checkout</th>
                    <td>
                        <input type="checkbox" name="stlq_use_woo" value="1" <?php checked(1, get_option('stlq_use_woo', 0)); ?> />
                        <p class="description">Enable WooCommerce integration (Add to cart instead of PayPal).</p>
                    </td>
                </tr>

                <tr valign="top">
                    <th scope="row">Upload Button Label</th>
                    <td><input type="text" name="stlq_upload_label" value="<?php echo esc_attr(get_option('stlq_upload_label', 'Choose file')); ?>" /></td>
                </tr>

                <tr valign="top">
                    <th scope="row">Submit Button Label</th>
                    <td><input type="text" name="stlq_submit_label" value="<?php echo esc_attr(get_option('stlq_submit_label', 'Get Quote & Preview')); ?>" /></td>
                </tr>

                <tr valign="top">
                    <th scope="row">Upload Button Colors</th>
                    <td>Background: <input type="color" name="stlq_upload_bg" value="<?php echo esc_attr(get_option('stlq_upload_bg', '#f0f0f0')); ?>" /> 
                        Text: <input type="color" name="stlq_upload_text" value="<?php echo esc_attr(get_option('stlq_upload_text', '#000000')); ?>" /></td>
                </tr>

                <tr valign="top">
                    <th scope="row">Submit Button Colors</th>
                    <td>Background: <input type="color" name="stlq_submit_bg" value="<?php echo esc_attr(get_option('stlq_submit_bg', '#0073aa')); ?>" /> 
                        Text: <input type="color" name="stlq_submit_text" value="<?php echo esc_attr(get_option('stlq_submit_text', '#ffffff')); ?>" /></td>
                </tr>
            
                <tr valign="top">
                    <th scope="row">Liste de couleurs (hex séparés par virgules)</th>
                    <td><input type="text" name="stlq_colors" value="<?php echo esc_attr(get_option('stlq_colors', '#888888,#FF0000,#00FF00,#0000FF')); ?>" style="width:400px;" />
                    <p class="description">Ex: #888888,#FF0000,#00FF00</p></td>
                </tr>

            </table>

            <?php submit_button(); ?>
        </form>
    </div>
<?php }
?>
