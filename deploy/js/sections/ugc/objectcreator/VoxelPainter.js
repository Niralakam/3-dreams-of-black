var VoxelPainter = function ( camera, scene ) {

	var UNIT_SIZE = 50, _size = 1, _color = 0xffffff,
	_mode = VoxelPainter.MODE_CREATE,
	_symmetry = false,
	_object = new UgcObject();

	var _intersectPoint, _intersectFace, _intersectObject,
	_intersectEraseObjects = [];

	// Colliders

	var _collider = new THREE.Object3D();
	_collider.matrixAutoUpdate = false;
	_collider.visible = false;

	var _colliderArray = [];

	var _geometry = new THREE.Plane( 2000, 2000, 16, 16 );
	var _material = new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.2, transparent: true, wireframe: true } );

	_plane = new THREE.Mesh( _geometry, _material );
	_plane.doubleSided = true;
	_plane.visible = _collider.visible;
	_collider.addChild( _plane );
	_colliderArray.push( _plane );

	_plane = new THREE.Mesh( _geometry, _material );
	_plane.rotation.y = - 90 * Math.PI / 180;
	_plane.doubleSided = true;
	_plane.visible = _collider.visible;
	_collider.addChild( _plane );
	_colliderArray.push( _plane );

	scene.addObject( _collider );

	// Mouse projection

	var projector, mouse2D, mouse3D, ray;

	projector = new THREE.Projector();

	mouse2D = new THREE.Vector3( 0, 0, 0.5 );
	ray = new THREE.Ray( camera.position, null );

	// Voxels

	var _voxelsArray = [];

	var _ground = new THREE.Mesh( new THREE.Plane( 2000, 2000, 40, 40 ), new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.1, transparent: true, wireframe: true } ) );
	_ground.position.x = - 25;
	_ground.position.y = - 25;
	_ground.position.z = - 25;
	_ground.rotation.x = - 90 * Math.PI / 180;
	scene.addObject( _ground );

	_voxelsArray.push( _ground );

	// Brushes

	var _voxel = new THREE.Mesh( new THREE.Cube( UNIT_SIZE, UNIT_SIZE, UNIT_SIZE ) ),
	_brush = [], _brushes = [],
	_brushMaterial = new THREE.MeshLambertMaterial( { color: _color, opacity: 0.5, transparent: true } );

	_brushes[ 0 ] = [];
	_brushes[ 1 ] = [];

	for ( var i = 1; i <= 5; i += 2 ) {

		_brushes[ 0 ][ i ] = new THREE.Mesh( new THREE.Geometry(), _brushMaterial );
		_brushes[ 0 ][ i ].visible = false;

		_brushes[ 1 ][ i ] = new THREE.Mesh( new THREE.Geometry(), _brushMaterial );
		_brushes[ 1 ][ i ].visible = false;

		var half_size = ( ( i * UNIT_SIZE ) / 2 ) - ( UNIT_SIZE / 2 );

		for ( var x = 0; x < i; x ++ ) {

			for ( var y = 0; y < i; y ++ ) {

				for ( var z = 0; z < i; z ++ ) {

					_voxel.position.x = x * UNIT_SIZE - half_size;
					_voxel.position.y = y * UNIT_SIZE - half_size;
					_voxel.position.z = z * UNIT_SIZE - half_size;

					GeometryUtils.merge( _brushes[ 0 ][ i ].geometry, _voxel );
					GeometryUtils.merge( _brushes[ 1 ][ i ].geometry, _voxel );

				}

			}

		}

		scene.addObject( _brushes[ 0 ][ i ] );
		scene.addObject( _brushes[ 1 ][ i ] );

	}

	_brush[ 0 ] = _brushes[ 0 ][ _size ];
	_brush[ 1 ] = _brushes[ 1 ][ _size ];

	//

	function toGridScale( value ) {

		return Math.round( value / UNIT_SIZE );

	}

	function addVoxel( x, y, z ) {

		if ( x < - 20 || x > 20 ) return;
		if ( y < 0 || y > 40 ) return;
		if ( z < - 20 || z > 20 ) return;

		var voxel = _object.getVoxel( x, y, z );

		if ( voxel ) {

			voxel.object.materials[ 0 ].color.setHex( _color );

		} else {

			voxel = new THREE.Mesh( _voxel.geometry, new THREE.MeshLambertMaterial( { color: _color } ) );
			voxel.position.x = x * UNIT_SIZE;
			voxel.position.y = y * UNIT_SIZE;
			voxel.position.z = z * UNIT_SIZE;
			voxel.matrixAutoUpdate = false;
			voxel.updateMatrix();
			voxel.update();
			scene.addObject( voxel );

			_voxelsArray.push( voxel );

			_object.addVoxel( x, y, z, _color, voxel );

		}

	}

	function deleteVoxel( voxel ) {

		_object.deleteVoxel( toGridScale( voxel.position.x ), toGridScale( voxel.position.y ), toGridScale( voxel.position.z ) );

		scene.removeObject( voxel );

		var i = _voxelsArray.indexOf( voxel );

		if ( i !== - 1 ) {

			_voxelsArray.splice( i, 1 );

		}

		delete voxel;

	}

	//

	this.setMode = function ( mode ) {

		_mode = mode;

	};

	this.setColor = function ( hex ) {

		_color = hex;
		_brushMaterial.color.setHex( _color );

	};

	this.setSize = function ( size ) {

		_size = size;

		_brush[ 0 ] = _brushes[ 0 ][ _size ];
		_brush[ 1 ] = _brushes[ 1 ][ _size ];

	};

	this.setSymmetry = function ( bool ) {

		_symmetry = bool;

	};

	this.moveMouse = function ( x, y ) {

		mouse2D.x = x * 2 - 1;
		mouse2D.y = - y * 2 + 1;

		mouse3D = projector.unprojectVector( mouse2D.clone(), camera );
		ray.direction = mouse3D.subSelf( camera.position ).normalize();


	};

	this.update = function ( mousedown ) {

		var intersects;

		// Restore opacity of last intersected object.
		for ( var i = 0, l = _intersectEraseObjects.length; i < l; i ++ ) {

			_intersectEraseObjects[ i ].materials[ 0 ].opacity = 1;

		}

		switch ( _mode ) {

			case VoxelPainter.MODE_CREATE:

				intersects = ray.intersectObjects( _voxelsArray );

				if ( ! mousedown ) {

					if ( intersects.length > 0 ) {

						_intersectPoint = intersects[ 0 ].point;
						_intersectObject = intersects[ 0 ].object;
						_intersectFace = intersects[ 0 ].face;

						_collider.position.copy( _intersectObject.matrixRotationWorld.multiplyVector3( _intersectFace.centroid.clone() ).addSelf( _intersectObject.position ) );
						_collider.position.addSelf( _intersectObject.matrixRotationWorld.multiplyVector3( _intersectFace.normal.clone() ) );
						_collider.updateMatrix();
						_collider.update();

						_brush[ 0 ].position.copy( _collider.position );
						_brush[ 0 ].position.x = toGridScale( _brush[ 0 ].position.x ) * UNIT_SIZE;
						_brush[ 0 ].position.y = toGridScale( _brush[ 0 ].position.y ) * UNIT_SIZE;
						_brush[ 0 ].position.z = toGridScale( _brush[ 0 ].position.z ) * UNIT_SIZE;
						_brush[ 0 ].visible = true;

						if ( _symmetry ) {

							_brush[ 1 ].position.copy( _brush[ 0 ].position );
							_brush[ 1 ].position.x = - _brush[ 1 ].position.x;
							_brush[ 1 ].visible = true;

						}

					} else {

						_intersectObject = null;
						_intersectFace = null;

						_brush[ 0 ].visible = false;
						_brush[ 1 ].visible = false;

					}

				} else {

					_brush[ 0 ].visible = false;
					_brush[ 1 ].visible = false;

					intersects = ray.intersectObjects( _colliderArray );

					if ( _intersectFace && intersects.length > 0 ) {

						/*
						var point = intersects[ 0 ].point,
						centroidWorld = _intersectObject.matrixRotationWorld.multiplyVector3( _intersectFace.centroid.clone() ).addSelf( _intersectObject.position ),
						distance = centroidWorld.distanceTo( point ),
						vector = centroidWorld.addSelf( _intersectObject.matrixRotationWorld.multiplyVector3( _intersectFace.normal.clone() ).multiplyScalar( distance ) );
						*/

						var vector = intersects[ 0 ].point;
						var x = toGridScale( vector.x ), y = toGridScale( vector.y ), z = toGridScale( vector.z );

						addVoxel( x, y, z );

						if ( _symmetry ) {

							addVoxel( - x, y, z );

						}

					}

				}

			break;

			case VoxelPainter.MODE_ERASE:

				intersects = ray.intersectObjects( _voxelsArray );

				if ( intersects.length > 0 && intersects[ 0 ].object != _ground ) {

					_intersectObject = intersects[ 0 ].object;

					if ( ! mousedown ) {

						_intersectObject.materials[ 0 ].opacity = 0.5;

						_intersectEraseObjects = [];
						_intersectEraseObjects.push( _intersectObject );

						if ( _symmetry ) {

							var voxel = _object.getVoxel( - toGridScale( _intersectObject.position.x ), toGridScale( _intersectObject.position.y ), toGridScale( _intersectObject.position.z ) );

							if ( voxel !== undefined ) {

								voxel.object.materials[ 0 ].opacity = 0.5;
								_intersectEraseObjects.push( voxel.object );

							}

						}

					} else {

						deleteVoxel( _intersectObject );

						if ( _symmetry ) {

							var voxel = _object.getVoxel( - toGridScale( _intersectObject.position.x ), toGridScale( _intersectObject.position.y ), toGridScale( _intersectObject.position.z ) );

							if ( voxel !== undefined ) deleteVoxel( voxel.object );

						}

					}

				}

			break;

		}

	};

	this.getObject = function () {

		return _object;

	};

}

VoxelPainter.MODE_CREATE = 'VoxelPainter.MODE_CREATE';
VoxelPainter.MODE_ERASE = 'VoxelPainter.MODE_ERASE';
