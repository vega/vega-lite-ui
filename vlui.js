;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
  'LocalStorageModule',
  'angular-google-analytics'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('dl', window.dl)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  // other libraries
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    typeNames: {
      N: 'text',
      O: 'text-ordinal',
      Q: 'number',
      T: 'time',
      G: 'geo'
    }
  })
  .config(['AnalyticsProvider', function (AnalyticsProvider) {
    AnalyticsProvider
      .setAccount({ tracker: 'UA-44428446-4', name: 'voyager', trackEvent: true });
  }]);
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button on-close=\"logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.length }})</h2><a ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.length > 0\" class=\"hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in Bookmarks.dict | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" ng-mouseover=\"(highlighted||{})[field.name] = true\" ng-mouseout=\"(highlighted||{})[field.name] = false\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\"></vl-plot-group></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <code>{{myriaRestUrl}}</code>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it to Voyager. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCountCaret || field.aggregate!==\'count\'}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeNames[field.type]}}\"></span></span> <span ng-if=\"field.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(field)\" class=\"field-func\" ng-class=\"{any: field._any}\">{{ func(field) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(field), any: field._any}\">{{ field.name | underscore2space }}</span></span> <span ng-if=\"field.aggregate===\'count\'\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink info\" ng-show=\"showInfo\"><i ng-if=\"field.aggregate !== \'count\' && isTypes(field, [\'N\', \'O\'])\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min}}<br> <strong>Max:</strong> {{stats.max}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"field.aggregate !== \'count\' && field.type === \'T\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | date: short}}<br> <strong>Max:</strong> {{stats.max | date: short}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"field.aggregate !== \'count\' && field.type === \'Q\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{field.name}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | number}}<br> <strong>Max:</strong> {{stats.max | number}}<br> <strong>Stdev:</strong> {{stats.stdev | number:2}}<br> <strong>Mean:</strong> {{stats.mean | number:2}}<br> <strong>Median:</strong> {{stats.median | number}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i><i ng-if=\"field.aggregate === \'count\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Count:</strong> {{stats.max}} </div>\" tooltip-side=\"right\"></i></span></span></span>");
$templateCache.put("modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && (maxHeight && (!height || height <= maxHeight)) && (maxWidth && (!width || width <= maxWidth)), overflow: alwaysScrollable || overflow || (maxHeight && height && height > maxHeight) || (maxWidth && width && width > maxWidth), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseover=\"mouseover()\" ng-mouseout=\"mouseout()\"><div class=\"vis-tooltip\" ng-show=\"tooltipActive\"><table><tr ng-repeat=\"p in data\"><td class=\"key\">{{p[0]}}</td><td class=\"value\"><b>{{p[1]}}</b></td></tr></table></div></div>");
$templateCache.put("vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\"><field-info ng-repeat=\"field in fieldSet\" ng-if=\"fieldSet\" field=\"field\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(field.name)), unselected: isSelected && !isSelected(field.name), highlighted: (highlighted||{})[field.name] }\" ng-mouseover=\"(highlighted||{})[field.name] = true\" ng-mouseout=\"(highlighted||{})[field.name] = false\"></field-info></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showMarkType\" class=\"command disabled\"><i class=\"fa fa-font\"></i> <i class=\"fa fa-line-chart\"></i> <i class=\"fa fa-area-chart\"></i> <i class=\"fa fa-bar-chart\"></i> <i class=\"fa fa-circle-o\"></i></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" ng-class=\"{active: chart.vlSpec && chart.vlSpec.cfg.filterNull.O}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" ng-click=\"Bookmarks.toggle(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a></div></div><vl-plot class=\"flex-grow-1\" data-fieldset=\"{fieldSet.key}}\" chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" max-height=\"maxHeight\" max-width=\"maxWidth\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot></div>");
$templateCache.put("vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vls</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"shCopied=\'(Copied)\'\" zeroclip-model=\"chart.shorthand\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'VL shorthand\', chart.shorthand); shCopied=\'(Logged)\';\">Log</a> <span>{{shCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', encoding: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', 'Logger', function (Bookmarks, consts, Logger) {
    return {
      templateUrl: 'bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        // The bookmark list is designed to render within a modal overlay.
        // Because modal contents are hidden via ng-if, if this link function is
        // executing it is because the directive is being shown. Log the event:
        Logger.logInteraction(Logger.actions.BOOKMARK_OPEN);
        scope.logBookmarksClosed = function() {
          Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
        };

        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.dict = {};
      this.length = 0;
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.updateLength = function() {
      this.length = Object.keys(this.dict).length;
    };

    proto.save = function() {
      localStorageService.set('bookmarks', this.dict);
    };

    proto.load = function() {
      this.dict = localStorageService.get('bookmarks') || {};
      this.updateLength();
    };

    proto.clear = function() {
      this.dict = {};
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.toggle = function(chart) {
      var shorthand = chart.shorthand;

      if (this.dict[shorthand]) {
        this.remove(chart);
      } else {
        this.add(chart);
      }
    };

    proto.add = function(chart) {
      var shorthand = chart.shorthand;

      console.log('adding', chart.vlSpec, shorthand);

      chart.timeAdded = (new Date().getTime());

      chart.stats = Dataset.stats;

      this.dict[shorthand] = _.cloneDeep(chart);
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      delete this.dict[shorthand];
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.isBookmarked = function(shorthand) {
      return shorthand in this.dict;
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        // Load the available datasets from Myria
        scope.loadDatasets('');

        scope.optionName = function(dataset) {
          return dataset.userName + ':' + dataset.programName + ':' + dataset.relationName;
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:inGroup
 * @function
 * @description
 * # inGroup
 * Get datasets in a particular group
 * @param  {String} datasetGroup One of "sample," "user", or "myria"
 * @return {Array} An array of datasets in the specified group
 */
angular.module('vlui')
  .filter('inGroup', ['_', function(_) {
    return function(arr, datasetGroup) {
      return _.where(arr, {
        group: datasetGroup
      });
    };
  }]);

/**
 * @ngdoc directive
 * @name vlui.directive:changeLoadedDataset
 * @description
 * # changeLoadedDataset
 */
angular.module('vlui')
  .directive('changeLoadedDataset', ['Dataset', '_', function (Dataset, _) {
    return {
      templateUrl: 'dataset/changeloadeddataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Expose dataset object itself so current dataset can be marked
        scope.Dataset = Dataset;

        scope.userData = _.filter(Dataset.datasets, function(dataset) {
          return dataset.group !== 'sample';
        });

        scope.sampleData = _.where(Dataset.datasets, {
          group: 'sample'
        });

        scope.$watch(function() {
          return Dataset.datasets.length;
        }, function() {
          scope.userData = _.filter(Dataset.datasets, function(dataset) {
            return dataset.group !== 'sample';
          });
        });

        scope.selectDataset = function(dataset) {
          // Activate the selected dataset
          Dataset.update(dataset);
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, field) {
    m[field.name] = field;
    return m;
  }, {});
}

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'dl', 'vl', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, dl, vl, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      N: 0,
      O: 0,
      G: 2,
      T: 3,
      Q: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(field) {
      if (field.aggregate==='count') return 4;
      return typeOrder[field.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(field) {
      return Dataset.fieldOrderBy.type(field) + '_' +
        (field.aggregate === 'count' ? '~' : field.name.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.name = function(field) {
      return field.name;
    };

    Dataset.fieldOrderBy.cardinality = function(field, stats) {
      return stats[field.name].distinct;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    Dataset.getSchema = function(data, stats, order) {
      var types = dl.type.inferAll(data),
        schema = _.reduce(types, function(s, type, name) {
          var field = {
            name: name,
            type: vl.data.types[type],
            primitiveType: type
          };

          if (field.type === 'Q' && stats[field.name].distinct <= 5) {
            field.type = 'O';
          }

          s.push(field);
          return s;
        }, []);

      schema = dl.stablesort(schema, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.name);

      schema.push(vl.encDef.count());
      return schema;
    };

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          Dataset.updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = dl.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          Dataset.updateFromData(dataset, data);
        });
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    Dataset.updateFromData = function(dataset, data) {
      Dataset.data = data;

      Dataset.currentDataset = dataset;
      Dataset.stats = vl.data.stats(Dataset.data);

      for (var fieldName in Dataset.stats) {
        if (fieldName !== '*') {
          Dataset.stats[fieldName].sample = _.sample(_.pluck(Dataset.data, fieldName), 7);
        }
      }

      Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
      Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
    };

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Modals', 'Logger', function(Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.loadDataset = function() {
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string,
      // & return true when max file size was not specified, is empty,
      // or is sufficiently large
      return !maxSize || ( size / 1024 / 1024 < +maxSize );
    }

    function isTypeValid(type, validMimeTypes) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
      return !validMimeTypes || ( validMimeTypes.indexOf(type) > -1 );
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            scope.$apply(function() {
              Alerts.add('Invalid file type. File must be one of following types: ' + scope.validMimeTypes);
            });
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            scope.$apply(function() {
              Alerts.add('File must be smaller than ' + scope.maxFileSize + ' MB');
            });
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'dl', function (Dataset, Logger, Config, _, dl) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = dl.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  description: 'Barley yield by variety across the upper midwest in 1931 and 1932',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  description: 'Automotive statistics for a variety of car models between 1970 & 1982',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Budget 2016',
  url: 'data/budget.json',
  id: 'budget',
  group: 'sample'
},{
  name: 'Climate Normals',
  url: 'data/climate.json',
  id: 'climate',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['Dataset', 'Drop', 'vl', 'consts', function (Dataset, Drop, vl, consts) {
    return {
      templateUrl: 'fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        field: '=',
        showType: '=',
        showInfo: '=',
        showCaret: '=',
        popupContent: '=',
        showRemove: '=',
        removeAction: '&',
        action: '&',
        disableCountCaret: '='
      },
      link: function(scope, element) {
        var funcsPopup;

        scope.typeNames = consts.typeNames;
        scope.stats = Dataset.stats[scope.field.name];
        scope.isTypes = vl.encDef.isTypes;

        switch(scope.field.type){
          case 'O':
            scope.icon = 'fa-font';
            break;
          case 'N':
            scope.icon = 'fa-font';
            break;
          case 'Q':
            scope.icon = 'icon-hash';
            break;
          case 'T':
            scope.icon = 'fa-calendar';
            break;
        }

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(field) {
          return field.aggregate || field.timeUnit ||
            (field.bin && 'bin') ||
            field._aggregate || field._timeUnit ||
            (field._bin && 'bin') || (field._any && 'auto');
        };

        scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        scope.$on('$destroy', function() {
          if (funcsPopup) {
            funcsPopup.destroy();
          }
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', ['vl', '_', function(vl, _) {
    var Config = {};

    Config.schema = vl.schema.schema.properties.config;
    Config.dataschema = vl.schema.schema.properties.data;

    Config.data = vl.schema.util.instantiate(Config.dataschema);
    Config.config = vl.schema.util.instantiate(Config.schema);

    Config.getConfig = function() {
      return _.cloneDeep(Config.config);
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        singleWidth: 400,
        singleHeight: 400,
        largeBandMaxCardinality: 20
      };
    };

    Config.small = function() {
      return {};
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', 'consts', 'Analytics', function ($location, $window, consts, Analytics) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARKTYPE_TOGGLE: {category: 'CHART', id:'MARKTYPE_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},

      //POLESTAR
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.DEBUG},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.DEBUG},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.DEBUG}
    };

    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels.INFO.rank) {
        Analytics.trackEvent(action.category, action.id, label, value);
        console.log('[Logging] ', action.id, label, data);
      }
    };

    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['$document', 'Modals', function ($document, Modals) {
    return {
      templateUrl: 'modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '=',
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        if (scope.maxWidth) {
          scope.wrapperStyle = 'max-width:' + scope.maxWidth;
        }

        // Default to closed unless autoOpen is set
        scope.isOpen = scope.autoOpen;

        // close on esc
        function escape(e) {
          if (e.keyCode === 27 && scope.isOpen) {
            scope.isOpen = false;
            scope.$digest();
          }
        }

        angular.element($document).on('keydown', escape);

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        'closeCallback': '&onClose'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeCallback) {
            scope.closeCallback();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['dl', 'vl', 'vg', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(dl, vl, vg, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return b.priority - a.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight:'=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500,
          TOOLTIP_TIMEOUT = 250;

        scope.visId = (counter++);
        scope.hoverPromise = null;
        scope.tooltipPromise = null;
        scope.hoverFocus = false;
        scope.tooltipActive = false;
        scope.destroyed = false;
        var format = vl.format('');

        scope.mouseover = function() {
          scope.hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, '', scope.chart.vlSpec);
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseout = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, '', scope.chart.vlSpec);
          }

          $timeout.cancel(scope.hoverPromise);
          scope.hoverFocus = scope.unlocked = false;
        };

        function viewOnMouseOver(event, item) {
          if (!item || !item.datum) { return; }

          scope.tooltipPromise = $timeout(function activateTooltip(){

            // avoid showing tooltip for facet's background
            if (item.datum._facetID) return;

            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum);


            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _(item.datum).omit('_prev', '_id') // omit vega internals
              .pairs().value()
              .map(function(p) {
                p[1] = dl.isNumber(p[1]) ? format(p[1]) : p[1];
                return p;
              });
            scope.$digest();

            var tooltip = element.find('.vis-tooltip'),
              $body = angular.element($document),
              width = tooltip.width(),
              height= tooltip.height();

            // put tooltip above if it's near the screen's bottom border
            if (event.pageY+10+height < $body.height()) {
              tooltip.css('top', (event.pageY+10));
            } else {
              tooltip.css('top', (event.pageY-10-height));
            }

            // put tooltip on left if it's near the screen's right border
            if (event.pageX+10+ width < $body.width()) {
              tooltip.css('left', (event.pageX+10));
            } else {
              tooltip.css('left', (event.pageX-10-width));
            }
          }, TOOLTIP_TIMEOUT);
        }

        function viewOnMouseOut(event, item) {
          //clear positions
          var tooltip = element.find('.vis-tooltip');
          tooltip.css('top', null);
          tooltip.css('left', null);
          $timeout.cancel(scope.tooltipPromise);
          if (scope.tooltipActive) {
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum);
          }
          scope.tooltipActive = false;
          scope.data = [];
          scope.$digest();
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) return;

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vl.extend(vlSpec.config, Config[configSet]());

          // use chart stats if available (for example from bookmarks)
          var stats = scope.chart.stats || Dataset.stats;

          return vl.compile(vlSpec, stats);
        }

        function getVisElement() {
          return element.find('.vega > :first-child');
        }

        function rescaleIfEnable() {
          var visElement = getVisElement();
          if (scope.rescale) {
            // have to digest the scope to ensure that
            // element.width() is bound by parent element!
            scope.$digest();

            var xRatio = Math.max(
                0.2,
                element.width() /  /* width of vlplot bounding box */
                scope.width /* width of the vis */
              );

            if (xRatio < 1) {
              visElement.width(scope.width * xRatio)
                        .height(scope.height * xRatio);
            }

          } else {
            visElement.css('transform', null)
                      .css('transform-origin', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? vl.Encoding.shorthand(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }

        function render(spec) {
          if (!spec) {
            if (view) {
              view.off('mouseover');
              view.off('mouseout');
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          scope.renderer = getRenderer(spec);

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart.fieldSetKey))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(chart) {
              try {
                var endParse = new Date().getTime();
                view = null;
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                view.renderer(getRenderer(spec.width, scope.height));
                view.update();

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, '', scope.chart.vlSpec);
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  view.on('mouseover', viewOnMouseOver);
                  view.on('mouseout', viewOnMouseOut);
                }
              } catch (e) {
                console.error(e);
              } finally {
                renderQueueNext();
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var view;
        scope.$watch(function() {
          // Omit data property to speed up deep watch
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            scope.chart.cleanSpec = vl.Encoding.fromSpec(scope.chart.vlSpec).toSpec(true);
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            view.off('mouseover');
            view.off('mouseout');
            view = null;
          }
          var shorthand = getShorthand();
          if (consts.debug && $window.views) {
            delete $window.views[shorthand];
          }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'dl', 'vl', 'Dataset', 'Logger', '_', function (Bookmarks, consts, dl, vl, Dataset, Logger, _) {
    return {
      templateUrl: 'vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      }],
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight: '=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',

        /* vlplotgroup specific */

        fieldSet: '=',

        showBookmark: '@',
        showDebug: '=',
        showExpand: '=',
        showFilterNull: '@',
        showLabel: '@',
        showLog: '@',
        showMarkType: '@',
        showSort: '@',
        showTranspose: '@',

        alwaysSelected: '=',
        isSelected: '=',
        highlighted: '=',
        expandAction: '&',
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.Dataset = Dataset;

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, encType) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            field = encoding[encType];

          return field && field.type ==='Q' && !field.bin;
        };

        scope.log.toggle = function(spec, encType) {
          if (!scope.log.support(spec, encType)) { return; }

          var field = spec.encoding[encType],
            scale = field.scale = field.scale || {};

          scale.type = scale.type === 'log' ? 'linear' : 'log';
          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand);
        };
        scope.log.active = function(spec, encType) {
          if (!scope.log.support(spec, encType)) { return; }

          var field = spec.encoding[encType],
            scale = field.scale = field.scale || {};

          return scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          spec.config = spec.config || {};
          spec.config.filterNull = spec.config.filterNull || {
            // TODO: initiate this from filterNull's schema instead
            N: false,
            O: false,
            T: true,
            Q: true
          };
          spec.config.filterNull.O = !spec.config.filterNull.O;
          spec.config.filterNull.N = !spec.config.filterNull.N;
        };

        scope.toggleFilterNull.support = function(spec, stats) {
          var fields = vl.enc.fields(spec.encoding);
          for (var fieldName in fields) {
            var fieldList = fields[fieldName];
            if (
                (fieldList.containsType.O || fieldList.containsType.N) &&
                (fieldName in stats) &&
                stats[fieldName].missing > 0
              ) {
              return true;
            }
          }
          return false;
        };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {
          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand);
          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          console.log('toggleSort', currentMode, newMode);

          var channels = toggleSort.channels(spec);
          spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.name,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.name,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (dl.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === 'N' || spec.encoding.x.type === 'O' ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec, stats) {
          var enc = spec.encoding;

          if (vl.enc.has(enc, 'row') || vl.enc.has(enc, 'col') ||
            !vl.enc.has(enc, 'x') || !vl.enc.has(enc, 'y') ||
            !vl.Encoding.alwaysNoOcclusion(spec, stats)) {
            return false;
          }

          return ( vl.encDef.isTypes(enc.x, ['N', 'O']) && vl.encDef.isMeasure(enc.y)) ? 'x' :
            ( vl.encDef.isTypes(enc.y, ['N','O']) && vl.encDef.isMeasure(enc.x)) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec, Dataset.stats)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand);
          vl.Encoding.transpose(scope.chart.vlSpec);
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroupPopup', ['Drop', function (Drop) {
    return {
      templateUrl: 'vlplotgroup/vlplotgrouppopup.html',
      restrict: 'E',
      require: '^^vlPlotGroup',
      scope: false,
      link: function postLink(scope, element, attrs, vlPlotGroupController) {
        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: vlPlotGroupController.getDropTarget(),
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

        scope.$on('$destroy', function() {
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', ['JSON3', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.encoding) {
        var encoding = _.omit(params.encoding, 'config');
        encoding = encodeURI(compactJSONFilter(encoding));
        url += 'entry.1323680136=' + encoding + '&';
      }

      if (params.encoding2) {
        var encoding2 = _.omit(params.encoding2, 'config');
        encoding2 = encodeURI(compactJSONFilter(encoding2));
        url += 'entry.853137786=' + encoding2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.encoding) {
        var encoding = _.omit(params.encoding, 'config');
        encoding = encodeURI(compactJSONFilter(encoding));
        url += 'entry.1245199477=' + encoding + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('scaleType', function() {
    return function(input) {
      var scaleTypes = {
        Q: 'Quantitative',
        N: 'Nominal',
        O: 'Ordinal',
        T: 'Time'
      };

      return scaleTypes[input];
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmpzIiwiYWxlcnRzL2FsZXJ0cy5zZXJ2aWNlLmpzIiwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5qcyIsImJvb2ttYXJrcy9ib29rbWFya3Muc2VydmljZS5qcyIsImRhdGFzZXQvYWRkbXlyaWFkYXRhc2V0LmpzIiwiZGF0YXNldC9hZGR1cmxkYXRhc2V0LmpzIiwiZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0LmpzIiwiZGF0YXNldC9kYXRhc2V0LnNlcnZpY2UuanMiLCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5qcyIsImRhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmpzIiwiZGF0YXNldC9maWxlZHJvcHpvbmUuanMiLCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5qcyIsImRhdGFzZXQvc2FtcGxlZGF0YS5qcyIsImZpZWxkaW5mby9maWVsZGluZm8uanMiLCJjb25maWcvY29uZmlnLnNlcnZpY2UuanMiLCJsb2dnZXIvbG9nZ2VyLnNlcnZpY2UuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsY2xvc2VidXR0b24uanMiLCJtb2RhbC9tb2RhbHMuc2VydmljZS5qcyIsInRhYnMvdGFiLmpzIiwidGFicy90YWJzZXQuanMiLCJ2bHBsb3QvdmxwbG90LmpzIiwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuanMiLCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmpzIiwiZmlsdGVycy9jb21wYWN0anNvbi9jb21wYWN0anNvbi5maWx0ZXIuanMiLCJmaWx0ZXJzL2VuY29kZXVyaS9lbmNvZGV1cmkuZmlsdGVyLmpzIiwiZmlsdGVycy9yZXBvcnR1cmwvcmVwb3J0dXJsLmZpbHRlci5qcyIsImZpbHRlcnMvc2NhbGV0eXBlL3NjYWxldHlwZS5maWx0ZXIuanMiLCJmaWx0ZXJzL3VuZGVy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VTtRQUNuQixJQUFJLFdBQVcsRUFBRSxLQUFLLE9BQU8sVUFBVTtRQUN2QyxXQUFXLFVBQVUsa0JBQWtCO1FBQ3ZDLE9BQU8sc0JBQXNCLFdBQVc7O01BRTFDLE9BQU87OztJQUdULE9BQU8sT0FBTyxVQUFVLFlBQVksZ0JBQWdCO01BQ25EOzs7O0FDM0RMOztBQUVBLFFBQVEsT0FBTztHQUNaLE9BQU8sYUFBYSxXQUFXO0lBQzlCLE9BQU8sU0FBUyxPQUFPO01BQ3JCLElBQUksYUFBYTtRQUNmLEdBQUc7UUFDSCxHQUFHO1FBQ0gsR0FBRztRQUNILEdBQUc7OztNQUdMLE9BQU8sV0FBVzs7O0FBR3hCOzs7QUNmQTs7Ozs7Ozs7OztBQVVBLFFBQVEsT0FBTztHQUNaLE9BQU8sb0JBQW9CLFlBQVk7SUFDdEMsT0FBTyxVQUFVLE9BQU87TUFDdEIsT0FBTyxRQUFRLE1BQU0sUUFBUSxPQUFPLE9BQU87O0tBRTVDIiwiZmlsZSI6InZsdWkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEpTT04zIHdpdGggY29tcGFjdCBzdHJpbmdpZnkgLS0gTW9kaWZpZWQgYnkgS2FuaXQgV29uZ3N1cGhhc2F3YXQuICAgaHR0cHM6Ly9naXRodWIuY29tL2thbml0dy9qc29uM1xuICpcbiAqIEZvcmtlZCBmcm9tIEpTT04gdjMuMy4yIHwgaHR0cHM6Ly9iZXN0aWVqcy5naXRodWIuaW8vanNvbjMgfCBDb3B5cmlnaHQgMjAxMi0yMDE0LCBLaXQgQ2FtYnJpZGdlIHwgaHR0cDovL2tpdC5taXQtbGljZW5zZS5vcmdcbiAqL1xuOyhmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCB0aGUgYGRlZmluZWAgZnVuY3Rpb24gZXhwb3NlZCBieSBhc3luY2hyb25vdXMgbW9kdWxlIGxvYWRlcnMuIFRoZVxuICAvLyBzdHJpY3QgYGRlZmluZWAgY2hlY2sgaXMgbmVjZXNzYXJ5IGZvciBjb21wYXRpYmlsaXR5IHdpdGggYHIuanNgLlxuICB2YXIgaXNMb2FkZXIgPSB0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZDtcblxuICAvLyBBIHNldCBvZiB0eXBlcyB1c2VkIHRvIGRpc3Rpbmd1aXNoIG9iamVjdHMgZnJvbSBwcmltaXRpdmVzLlxuICB2YXIgb2JqZWN0VHlwZXMgPSB7XG4gICAgXCJmdW5jdGlvblwiOiB0cnVlLFxuICAgIFwib2JqZWN0XCI6IHRydWVcbiAgfTtcblxuICAvLyBEZXRlY3QgdGhlIGBleHBvcnRzYCBvYmplY3QgZXhwb3NlZCBieSBDb21tb25KUyBpbXBsZW1lbnRhdGlvbnMuXG4gIHZhciBmcmVlRXhwb3J0cyA9IG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzICYmICFleHBvcnRzLm5vZGVUeXBlICYmIGV4cG9ydHM7XG5cbiAgLy8gVXNlIHRoZSBgZ2xvYmFsYCBvYmplY3QgZXhwb3NlZCBieSBOb2RlIChpbmNsdWRpbmcgQnJvd3NlcmlmeSB2aWFcbiAgLy8gYGluc2VydC1tb2R1bGUtZ2xvYmFsc2ApLCBOYXJ3aGFsLCBhbmQgUmluZ28gYXMgdGhlIGRlZmF1bHQgY29udGV4dCxcbiAgLy8gYW5kIHRoZSBgd2luZG93YCBvYmplY3QgaW4gYnJvd3NlcnMuIFJoaW5vIGV4cG9ydHMgYSBgZ2xvYmFsYCBmdW5jdGlvblxuICAvLyBpbnN0ZWFkLlxuICB2YXIgcm9vdCA9IG9iamVjdFR5cGVzW3R5cGVvZiB3aW5kb3ddICYmIHdpbmRvdyB8fCB0aGlzLFxuICAgICAgZnJlZUdsb2JhbCA9IGZyZWVFeHBvcnRzICYmIG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlICYmIHR5cGVvZiBnbG9iYWwgPT0gXCJvYmplY3RcIiAmJiBnbG9iYWw7XG5cbiAgaWYgKGZyZWVHbG9iYWwgJiYgKGZyZWVHbG9iYWxbXCJnbG9iYWxcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcIndpbmRvd1wiXSA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsW1wic2VsZlwiXSA9PT0gZnJlZUdsb2JhbCkpIHtcbiAgICByb290ID0gZnJlZUdsb2JhbDtcbiAgfVxuXG4gIC8vIFB1YmxpYzogSW5pdGlhbGl6ZXMgSlNPTiAzIHVzaW5nIHRoZSBnaXZlbiBgY29udGV4dGAgb2JqZWN0LCBhdHRhY2hpbmcgdGhlXG4gIC8vIGBzdHJpbmdpZnlgIGFuZCBgcGFyc2VgIGZ1bmN0aW9ucyB0byB0aGUgc3BlY2lmaWVkIGBleHBvcnRzYCBvYmplY3QuXG4gIGZ1bmN0aW9uIHJ1bkluQ29udGV4dChjb250ZXh0LCBleHBvcnRzKSB7XG4gICAgY29udGV4dCB8fCAoY29udGV4dCA9IHJvb3RbXCJPYmplY3RcIl0oKSk7XG4gICAgZXhwb3J0cyB8fCAoZXhwb3J0cyA9IHJvb3RbXCJPYmplY3RcIl0oKSk7XG5cbiAgICAvLyBOYXRpdmUgY29uc3RydWN0b3IgYWxpYXNlcy5cbiAgICB2YXIgTnVtYmVyID0gY29udGV4dFtcIk51bWJlclwiXSB8fCByb290W1wiTnVtYmVyXCJdLFxuICAgICAgICBTdHJpbmcgPSBjb250ZXh0W1wiU3RyaW5nXCJdIHx8IHJvb3RbXCJTdHJpbmdcIl0sXG4gICAgICAgIE9iamVjdCA9IGNvbnRleHRbXCJPYmplY3RcIl0gfHwgcm9vdFtcIk9iamVjdFwiXSxcbiAgICAgICAgRGF0ZSA9IGNvbnRleHRbXCJEYXRlXCJdIHx8IHJvb3RbXCJEYXRlXCJdLFxuICAgICAgICBTeW50YXhFcnJvciA9IGNvbnRleHRbXCJTeW50YXhFcnJvclwiXSB8fCByb290W1wiU3ludGF4RXJyb3JcIl0sXG4gICAgICAgIFR5cGVFcnJvciA9IGNvbnRleHRbXCJUeXBlRXJyb3JcIl0gfHwgcm9vdFtcIlR5cGVFcnJvclwiXSxcbiAgICAgICAgTWF0aCA9IGNvbnRleHRbXCJNYXRoXCJdIHx8IHJvb3RbXCJNYXRoXCJdLFxuICAgICAgICBuYXRpdmVKU09OID0gY29udGV4dFtcIkpTT05cIl0gfHwgcm9vdFtcIkpTT05cIl07XG5cbiAgICAvLyBEZWxlZ2F0ZSB0byB0aGUgbmF0aXZlIGBzdHJpbmdpZnlgIGFuZCBgcGFyc2VgIGltcGxlbWVudGF0aW9ucy5cbiAgICBpZiAodHlwZW9mIG5hdGl2ZUpTT04gPT0gXCJvYmplY3RcIiAmJiBuYXRpdmVKU09OKSB7XG4gICAgICBleHBvcnRzLnN0cmluZ2lmeSA9IG5hdGl2ZUpTT04uc3RyaW5naWZ5O1xuICAgICAgZXhwb3J0cy5wYXJzZSA9IG5hdGl2ZUpTT04ucGFyc2U7XG4gICAgfVxuXG4gICAgLy8gQ29udmVuaWVuY2UgYWxpYXNlcy5cbiAgICB2YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlLFxuICAgICAgICBnZXRDbGFzcyA9IG9iamVjdFByb3RvLnRvU3RyaW5nLFxuICAgICAgICBpc1Byb3BlcnR5LCBmb3JFYWNoLCB1bmRlZjtcblxuICAgIC8vIFRlc3QgdGhlIGBEYXRlI2dldFVUQypgIG1ldGhvZHMuIEJhc2VkIG9uIHdvcmsgYnkgQFlhZmZsZS5cbiAgICB2YXIgaXNFeHRlbmRlZCA9IG5ldyBEYXRlKC0zNTA5ODI3MzM0NTczMjkyKTtcbiAgICB0cnkge1xuICAgICAgLy8gVGhlIGBnZXRVVENGdWxsWWVhcmAsIGBNb250aGAsIGFuZCBgRGF0ZWAgbWV0aG9kcyByZXR1cm4gbm9uc2Vuc2ljYWxcbiAgICAgIC8vIHJlc3VsdHMgZm9yIGNlcnRhaW4gZGF0ZXMgaW4gT3BlcmEgPj0gMTAuNTMuXG4gICAgICBpc0V4dGVuZGVkID0gaXNFeHRlbmRlZC5nZXRVVENGdWxsWWVhcigpID09IC0xMDkyNTIgJiYgaXNFeHRlbmRlZC5nZXRVVENNb250aCgpID09PSAwICYmIGlzRXh0ZW5kZWQuZ2V0VVRDRGF0ZSgpID09PSAxICYmXG4gICAgICAgIC8vIFNhZmFyaSA8IDIuMC4yIHN0b3JlcyB0aGUgaW50ZXJuYWwgbWlsbGlzZWNvbmQgdGltZSB2YWx1ZSBjb3JyZWN0bHksXG4gICAgICAgIC8vIGJ1dCBjbGlwcyB0aGUgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBkYXRlIG1ldGhvZHMgdG8gdGhlIHJhbmdlIG9mXG4gICAgICAgIC8vIHNpZ25lZCAzMi1iaXQgaW50ZWdlcnMgKFstMiAqKiAzMSwgMiAqKiAzMSAtIDFdKS5cbiAgICAgICAgaXNFeHRlbmRlZC5nZXRVVENIb3VycygpID09IDEwICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWludXRlcygpID09IDM3ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDU2Vjb25kcygpID09IDYgJiYgaXNFeHRlbmRlZC5nZXRVVENNaWxsaXNlY29uZHMoKSA9PSA3MDg7XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuXG4gICAgLy8gSW50ZXJuYWw6IERldGVybWluZXMgd2hldGhlciB0aGUgbmF0aXZlIGBKU09OLnN0cmluZ2lmeWAgYW5kIGBwYXJzZWBcbiAgICAvLyBpbXBsZW1lbnRhdGlvbnMgYXJlIHNwZWMtY29tcGxpYW50LiBCYXNlZCBvbiB3b3JrIGJ5IEtlbiBTbnlkZXIuXG4gICAgZnVuY3Rpb24gaGFzKG5hbWUpIHtcbiAgICAgIGlmIChoYXNbbmFtZV0gIT09IHVuZGVmKSB7XG4gICAgICAgIC8vIFJldHVybiBjYWNoZWQgZmVhdHVyZSB0ZXN0IHJlc3VsdC5cbiAgICAgICAgcmV0dXJuIGhhc1tuYW1lXTtcbiAgICAgIH1cbiAgICAgIHZhciBpc1N1cHBvcnRlZDtcbiAgICAgIGlmIChuYW1lID09IFwiYnVnLXN0cmluZy1jaGFyLWluZGV4XCIpIHtcbiAgICAgICAgLy8gSUUgPD0gNyBkb2Vzbid0IHN1cHBvcnQgYWNjZXNzaW5nIHN0cmluZyBjaGFyYWN0ZXJzIHVzaW5nIHNxdWFyZVxuICAgICAgICAvLyBicmFja2V0IG5vdGF0aW9uLiBJRSA4IG9ubHkgc3VwcG9ydHMgdGhpcyBmb3IgcHJpbWl0aXZlcy5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBcImFcIlswXSAhPSBcImFcIjtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PSBcImpzb25cIikge1xuICAgICAgICAvLyBJbmRpY2F0ZXMgd2hldGhlciBib3RoIGBKU09OLnN0cmluZ2lmeWAgYW5kIGBKU09OLnBhcnNlYCBhcmVcbiAgICAgICAgLy8gc3VwcG9ydGVkLlxuICAgICAgICBpc1N1cHBvcnRlZCA9IGhhcyhcImpzb24tc3RyaW5naWZ5XCIpICYmIGhhcyhcImpzb24tcGFyc2VcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdmFsdWUsIHNlcmlhbGl6ZWQgPSAne1wiYVwiOlsxLHRydWUsZmFsc2UsbnVsbCxcIlxcXFx1MDAwMFxcXFxiXFxcXG5cXFxcZlxcXFxyXFxcXHRcIl19JztcbiAgICAgICAgLy8gVGVzdCBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICBpZiAobmFtZSA9PSBcImpzb24tc3RyaW5naWZ5XCIpIHtcbiAgICAgICAgICB2YXIgc3RyaW5naWZ5ID0gZXhwb3J0cy5zdHJpbmdpZnksIHN0cmluZ2lmeVN1cHBvcnRlZCA9IHR5cGVvZiBzdHJpbmdpZnkgPT0gXCJmdW5jdGlvblwiICYmIGlzRXh0ZW5kZWQ7XG4gICAgICAgICAgaWYgKHN0cmluZ2lmeVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgLy8gQSB0ZXN0IGZ1bmN0aW9uIG9iamVjdCB3aXRoIGEgY3VzdG9tIGB0b0pTT05gIG1ldGhvZC5cbiAgICAgICAgICAgICh2YWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9KS50b0pTT04gPSB2YWx1ZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHN0cmluZ2lmeVN1cHBvcnRlZCA9XG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCAzLjFiMSBhbmQgYjIgc2VyaWFsaXplIHN0cmluZywgbnVtYmVyLCBhbmQgYm9vbGVhblxuICAgICAgICAgICAgICAgIC8vIHByaW1pdGl2ZXMgYXMgb2JqZWN0IGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSgwKSA9PT0gXCIwXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgYjIsIGFuZCBKU09OIDIgc2VyaWFsaXplIHdyYXBwZWQgcHJpbWl0aXZlcyBhcyBvYmplY3RcbiAgICAgICAgICAgICAgICAvLyBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IE51bWJlcigpKSA9PT0gXCIwXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IFN0cmluZygpKSA9PSAnXCJcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiB0aHJvdyBhbiBlcnJvciBpZiB0aGUgdmFsdWUgaXMgYG51bGxgLCBgdW5kZWZpbmVkYCwgb3JcbiAgICAgICAgICAgICAgICAvLyBkb2VzIG5vdCBkZWZpbmUgYSBjYW5vbmljYWwgSlNPTiByZXByZXNlbnRhdGlvbiAodGhpcyBhcHBsaWVzIHRvXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0cyB3aXRoIGB0b0pTT05gIHByb3BlcnRpZXMgYXMgd2VsbCwgKnVubGVzcyogdGhleSBhcmUgbmVzdGVkXG4gICAgICAgICAgICAgICAgLy8gd2l0aGluIGFuIG9iamVjdCBvciBhcnJheSkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KGdldENsYXNzKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBJRSA4IHNlcmlhbGl6ZXMgYHVuZGVmaW5lZGAgYXMgYFwidW5kZWZpbmVkXCJgLiBTYWZhcmkgPD0gNS4xLjcgYW5kXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjMgcGFzcyB0aGlzIHRlc3QuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHVuZGVmKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjcgYW5kIEZGIDMuMWIzIHRocm93IGBFcnJvcmBzIGFuZCBgVHlwZUVycm9yYHMsXG4gICAgICAgICAgICAgICAgLy8gcmVzcGVjdGl2ZWx5LCBpZiB0aGUgdmFsdWUgaXMgb21pdHRlZCBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiB0aHJvdyBhbiBlcnJvciBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgbm90IGEgbnVtYmVyLFxuICAgICAgICAgICAgICAgIC8vIHN0cmluZywgYXJyYXksIG9iamVjdCwgQm9vbGVhbiwgb3IgYG51bGxgIGxpdGVyYWwuIFRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBjdXN0b20gYHRvSlNPTmAgbWV0aG9kcyBhcyB3ZWxsLCB1bmxlc3MgdGhleSBhcmUgbmVzdGVkXG4gICAgICAgICAgICAgICAgLy8gaW5zaWRlIG9iamVjdCBvciBhcnJheSBsaXRlcmFscy4gWVVJIDMuMC4wYjEgaWdub3JlcyBjdXN0b20gYHRvSlNPTmBcbiAgICAgICAgICAgICAgICAvLyBtZXRob2RzIGVudGlyZWx5LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh2YWx1ZSkgPT09IFwiMVwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt2YWx1ZV0pID09IFwiWzFdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBQcm90b3R5cGUgPD0gMS42LjEgc2VyaWFsaXplcyBgW3VuZGVmaW5lZF1gIGFzIGBcIltdXCJgIGluc3RlYWQgb2ZcbiAgICAgICAgICAgICAgICAvLyBgXCJbbnVsbF1cImAuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZl0pID09IFwiW251bGxdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBZVUkgMy4wLjBiMSBmYWlscyB0byBzZXJpYWxpemUgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShudWxsKSA9PSBcIm51bGxcIiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIGhhbHRzIHNlcmlhbGl6YXRpb24gaWYgYW4gYXJyYXkgY29udGFpbnMgYSBmdW5jdGlvbjpcbiAgICAgICAgICAgICAgICAvLyBgWzEsIHRydWUsIGdldENsYXNzLCAxXWAgc2VyaWFsaXplcyBhcyBcIlsxLHRydWUsXSxcIi4gRkYgMy4xYjNcbiAgICAgICAgICAgICAgICAvLyBlbGlkZXMgbm9uLUpTT04gdmFsdWVzIGZyb20gb2JqZWN0cyBhbmQgYXJyYXlzLCB1bmxlc3MgdGhleVxuICAgICAgICAgICAgICAgIC8vIGRlZmluZSBjdXN0b20gYHRvSlNPTmAgbWV0aG9kcy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmLCBnZXRDbGFzcywgbnVsbF0pID09IFwiW251bGwsbnVsbCxudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHNlcmlhbGl6YXRpb24gdGVzdC4gRkYgMy4xYjEgdXNlcyBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZXNcbiAgICAgICAgICAgICAgICAvLyB3aGVyZSBjaGFyYWN0ZXIgZXNjYXBlIGNvZGVzIGFyZSBleHBlY3RlZCAoZS5nLiwgYFxcYmAgPT4gYFxcdTAwMDhgKS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoeyBcImFcIjogW3ZhbHVlLCB0cnVlLCBmYWxzZSwgbnVsbCwgXCJcXHgwMFxcYlxcblxcZlxcclxcdFwiXSB9KSA9PSBzZXJpYWxpemVkICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEgYW5kIGIyIGlnbm9yZSB0aGUgYGZpbHRlcmAgYW5kIGB3aWR0aGAgYXJndW1lbnRzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShudWxsLCB2YWx1ZSkgPT09IFwiMVwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFsxLCAyXSwgbnVsbCwgMSkgPT0gXCJbXFxuIDEsXFxuIDJcXG5dXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBKU09OIDIsIFByb3RvdHlwZSA8PSAxLjcsIGFuZCBvbGRlciBXZWJLaXQgYnVpbGRzIGluY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgLy8gc2VyaWFsaXplIGV4dGVuZGVkIHllYXJzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtOC42NGUxNSkpID09ICdcIi0yNzE4MjEtMDQtMjBUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFRoZSBtaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUsIGJ1dCByZXF1aXJlZCBpbiA1LjEuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKDguNjRlMTUpKSA9PSAnXCIrMjc1NzYwLTA5LTEzVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBGaXJlZm94IDw9IDExLjAgaW5jb3JyZWN0bHkgc2VyaWFsaXplcyB5ZWFycyBwcmlvciB0byAwIGFzIG5lZ2F0aXZlXG4gICAgICAgICAgICAgICAgLy8gZm91ci1kaWdpdCB5ZWFycyBpbnN0ZWFkIG9mIHNpeC1kaWdpdCB5ZWFycy4gQ3JlZGl0czogQFlhZmZsZS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTYyMTk4NzU1MmU1KSkgPT0gJ1wiLTAwMDAwMS0wMS0wMVQwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS41IGFuZCBPcGVyYSA+PSAxMC41MyBpbmNvcnJlY3RseSBzZXJpYWxpemUgbWlsbGlzZWNvbmRcbiAgICAgICAgICAgICAgICAvLyB2YWx1ZXMgbGVzcyB0aGFuIDEwMDAuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC0xKSkgPT0gJ1wiMTk2OS0xMi0zMVQyMzo1OTo1OS45OTlaXCInO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgIHN0cmluZ2lmeVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHN0cmluZ2lmeVN1cHBvcnRlZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBUZXN0IGBKU09OLnBhcnNlYC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXBhcnNlXCIpIHtcbiAgICAgICAgICB2YXIgcGFyc2UgPSBleHBvcnRzLnBhcnNlO1xuICAgICAgICAgIGlmICh0eXBlb2YgcGFyc2UgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgYjIgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYSBiYXJlIGxpdGVyYWwgaXMgcHJvdmlkZWQuXG4gICAgICAgICAgICAgIC8vIENvbmZvcm1pbmcgaW1wbGVtZW50YXRpb25zIHNob3VsZCBhbHNvIGNvZXJjZSB0aGUgaW5pdGlhbCBhcmd1bWVudCB0b1xuICAgICAgICAgICAgICAvLyBhIHN0cmluZyBwcmlvciB0byBwYXJzaW5nLlxuICAgICAgICAgICAgICBpZiAocGFyc2UoXCIwXCIpID09PSAwICYmICFwYXJzZShmYWxzZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBTaW1wbGUgcGFyc2luZyB0ZXN0LlxuICAgICAgICAgICAgICAgIHZhbHVlID0gcGFyc2Uoc2VyaWFsaXplZCk7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnNlU3VwcG9ydGVkID0gdmFsdWVbXCJhXCJdLmxlbmd0aCA9PSA1ICYmIHZhbHVlW1wiYVwiXVswXSA9PT0gMTtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuMiBhbmQgRkYgMy4xYjEgYWxsb3cgdW5lc2NhcGVkIHRhYnMgaW4gc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSAhcGFyc2UoJ1wiXFx0XCInKTtcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZGIDQuMCBhbmQgNC4wLjEgYWxsb3cgbGVhZGluZyBgK2Agc2lnbnMgYW5kIGxlYWRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAvLyBkZWNpbWFsIHBvaW50cy4gRkYgNC4wLCA0LjAuMSwgYW5kIElFIDktMTAgYWxzbyBhbGxvd1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGNlcnRhaW4gb2N0YWwgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBwYXJzZShcIjAxXCIpICE9PSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAsIDQuMC4xLCBhbmQgUmhpbm8gMS43UjMtUjQgYWxsb3cgdHJhaWxpbmcgZGVjaW1hbFxuICAgICAgICAgICAgICAgICAgICAgIC8vIHBvaW50cy4gVGhlc2UgZW52aXJvbm1lbnRzLCBhbG9uZyB3aXRoIEZGIDMuMWIxIGFuZCAyLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFsc28gYWxsb3cgdHJhaWxpbmcgY29tbWFzIGluIEpTT04gb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIxLlwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlzU3VwcG9ydGVkID0gcGFyc2VTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNbbmFtZV0gPSAhIWlzU3VwcG9ydGVkO1xuICAgIH1cblxuICAgIGlmICh0cnVlKSB7IC8vIHVzZWQgdG8gYmUgIWhhcyhcImpzb25cIilcbiAgICAgIC8vIENvbW1vbiBgW1tDbGFzc11dYCBuYW1lIGFsaWFzZXMuXG4gICAgICB2YXIgZnVuY3Rpb25DbGFzcyA9IFwiW29iamVjdCBGdW5jdGlvbl1cIixcbiAgICAgICAgICBkYXRlQ2xhc3MgPSBcIltvYmplY3QgRGF0ZV1cIixcbiAgICAgICAgICBudW1iZXJDbGFzcyA9IFwiW29iamVjdCBOdW1iZXJdXCIsXG4gICAgICAgICAgc3RyaW5nQ2xhc3MgPSBcIltvYmplY3QgU3RyaW5nXVwiLFxuICAgICAgICAgIGFycmF5Q2xhc3MgPSBcIltvYmplY3QgQXJyYXldXCIsXG4gICAgICAgICAgYm9vbGVhbkNsYXNzID0gXCJbb2JqZWN0IEJvb2xlYW5dXCI7XG5cbiAgICAgIC8vIERldGVjdCBpbmNvbXBsZXRlIHN1cHBvcnQgZm9yIGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyBieSBpbmRleC5cbiAgICAgIHZhciBjaGFySW5kZXhCdWdneSA9IGhhcyhcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKTtcblxuICAgICAgLy8gRGVmaW5lIGFkZGl0aW9uYWwgdXRpbGl0eSBtZXRob2RzIGlmIHRoZSBgRGF0ZWAgbWV0aG9kcyBhcmUgYnVnZ3kuXG4gICAgICBpZiAoIWlzRXh0ZW5kZWQpIHtcbiAgICAgICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICAgICAgLy8gQSBtYXBwaW5nIGJldHdlZW4gdGhlIG1vbnRocyBvZiB0aGUgeWVhciBhbmQgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW5cbiAgICAgICAgLy8gSmFudWFyeSAxc3QgYW5kIHRoZSBmaXJzdCBvZiB0aGUgcmVzcGVjdGl2ZSBtb250aC5cbiAgICAgICAgdmFyIE1vbnRocyA9IFswLCAzMSwgNTksIDkwLCAxMjAsIDE1MSwgMTgxLCAyMTIsIDI0MywgMjczLCAzMDQsIDMzNF07XG4gICAgICAgIC8vIEludGVybmFsOiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuIHRoZSBVbml4IGVwb2NoIGFuZCB0aGVcbiAgICAgICAgLy8gZmlyc3QgZGF5IG9mIHRoZSBnaXZlbiBtb250aC5cbiAgICAgICAgdmFyIGdldERheSA9IGZ1bmN0aW9uICh5ZWFyLCBtb250aCkge1xuICAgICAgICAgIHJldHVybiBNb250aHNbbW9udGhdICsgMzY1ICogKHllYXIgLSAxOTcwKSArIGZsb29yKCh5ZWFyIC0gMTk2OSArIChtb250aCA9ICsobW9udGggPiAxKSkpIC8gNCkgLSBmbG9vcigoeWVhciAtIDE5MDEgKyBtb250aCkgLyAxMDApICsgZmxvb3IoKHllYXIgLSAxNjAxICsgbW9udGgpIC8gNDAwKTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50ZXJuYWw6IERldGVybWluZXMgaWYgYSBwcm9wZXJ0eSBpcyBhIGRpcmVjdCBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW5cbiAgICAgIC8vIG9iamVjdC4gRGVsZWdhdGVzIHRvIHRoZSBuYXRpdmUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgbWV0aG9kLlxuICAgICAgaWYgKCEoaXNQcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5KSkge1xuICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgY29uc3RydWN0b3I7XG4gICAgICAgICAgaWYgKChtZW1iZXJzLl9fcHJvdG9fXyA9IG51bGwsIG1lbWJlcnMuX19wcm90b19fID0ge1xuICAgICAgICAgICAgLy8gVGhlICpwcm90byogcHJvcGVydHkgY2Fubm90IGJlIHNldCBtdWx0aXBsZSB0aW1lcyBpbiByZWNlbnRcbiAgICAgICAgICAgIC8vIHZlcnNpb25zIG9mIEZpcmVmb3ggYW5kIFNlYU1vbmtleS5cbiAgICAgICAgICAgIFwidG9TdHJpbmdcIjogMVxuICAgICAgICAgIH0sIG1lbWJlcnMpLnRvU3RyaW5nICE9IGdldENsYXNzKSB7XG4gICAgICAgICAgICAvLyBTYWZhcmkgPD0gMi4wLjMgZG9lc24ndCBpbXBsZW1lbnQgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAsIGJ1dFxuICAgICAgICAgICAgLy8gc3VwcG9ydHMgdGhlIG11dGFibGUgKnByb3RvKiBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgLy8gQ2FwdHVyZSBhbmQgYnJlYWsgdGhlIG9iamVjdCdzIHByb3RvdHlwZSBjaGFpbiAoc2VlIHNlY3Rpb24gOC42LjJcbiAgICAgICAgICAgICAgLy8gb2YgdGhlIEVTIDUuMSBzcGVjKS4gVGhlIHBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvbiBwcmV2ZW50cyBhblxuICAgICAgICAgICAgICAvLyB1bnNhZmUgdHJhbnNmb3JtYXRpb24gYnkgdGhlIENsb3N1cmUgQ29tcGlsZXIuXG4gICAgICAgICAgICAgIHZhciBvcmlnaW5hbCA9IHRoaXMuX19wcm90b19fLCByZXN1bHQgPSBwcm9wZXJ0eSBpbiAodGhpcy5fX3Byb3RvX18gPSBudWxsLCB0aGlzKTtcbiAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcHJvdG90eXBlIGNoYWluLlxuICAgICAgICAgICAgICB0aGlzLl9fcHJvdG9fXyA9IG9yaWdpbmFsO1xuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2FwdHVyZSBhIHJlZmVyZW5jZSB0byB0aGUgdG9wLWxldmVsIGBPYmplY3RgIGNvbnN0cnVjdG9yLlxuICAgICAgICAgICAgY29uc3RydWN0b3IgPSBtZW1iZXJzLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IHRvIHNpbXVsYXRlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGluXG4gICAgICAgICAgICAvLyBvdGhlciBlbnZpcm9ubWVudHMuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIHZhciBwYXJlbnQgPSAodGhpcy5jb25zdHJ1Y3RvciB8fCBjb25zdHJ1Y3RvcikucHJvdG90eXBlO1xuICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHkgaW4gdGhpcyAmJiAhKHByb3BlcnR5IGluIHBhcmVudCAmJiB0aGlzW3Byb3BlcnR5XSA9PT0gcGFyZW50W3Byb3BlcnR5XSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBtZW1iZXJzID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gaXNQcm9wZXJ0eS5jYWxsKHRoaXMsIHByb3BlcnR5KTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50ZXJuYWw6IE5vcm1hbGl6ZXMgdGhlIGBmb3IuLi5pbmAgaXRlcmF0aW9uIGFsZ29yaXRobSBhY3Jvc3NcbiAgICAgIC8vIGVudmlyb25tZW50cy4gRWFjaCBlbnVtZXJhdGVkIGtleSBpcyB5aWVsZGVkIHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi5cbiAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2l6ZSA9IDAsIFByb3BlcnRpZXMsIG1lbWJlcnMsIHByb3BlcnR5O1xuXG4gICAgICAgIC8vIFRlc3RzIGZvciBidWdzIGluIHRoZSBjdXJyZW50IGVudmlyb25tZW50J3MgYGZvci4uLmluYCBhbGdvcml0aG0uIFRoZVxuICAgICAgICAvLyBgdmFsdWVPZmAgcHJvcGVydHkgaW5oZXJpdHMgdGhlIG5vbi1lbnVtZXJhYmxlIGZsYWcgZnJvbVxuICAgICAgICAvLyBgT2JqZWN0LnByb3RvdHlwZWAgaW4gb2xkZXIgdmVyc2lvbnMgb2YgSUUsIE5ldHNjYXBlLCBhbmQgTW96aWxsYS5cbiAgICAgICAgKFByb3BlcnRpZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhpcy52YWx1ZU9mID0gMDtcbiAgICAgICAgfSkucHJvdG90eXBlLnZhbHVlT2YgPSAwO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgYFByb3BlcnRpZXNgIGNsYXNzLlxuICAgICAgICBtZW1iZXJzID0gbmV3IFByb3BlcnRpZXMoKTtcbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBtZW1iZXJzKSB7XG4gICAgICAgICAgLy8gSWdub3JlIGFsbCBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgICBpZiAoaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBQcm9wZXJ0aWVzID0gbWVtYmVycyA9IG51bGw7XG5cbiAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBpdGVyYXRpb24gYWxnb3JpdGhtLlxuICAgICAgICBpZiAoIXNpemUpIHtcbiAgICAgICAgICAvLyBBIGxpc3Qgb2Ygbm9uLWVudW1lcmFibGUgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgbWVtYmVycyA9IFtcInZhbHVlT2ZcIiwgXCJ0b1N0cmluZ1wiLCBcInRvTG9jYWxlU3RyaW5nXCIsIFwicHJvcGVydHlJc0VudW1lcmFibGVcIiwgXCJpc1Byb3RvdHlwZU9mXCIsIFwiaGFzT3duUHJvcGVydHlcIiwgXCJjb25zdHJ1Y3RvclwiXTtcbiAgICAgICAgICAvLyBJRSA8PSA4LCBNb3ppbGxhIDEuMCwgYW5kIE5ldHNjYXBlIDYuMiBpZ25vcmUgc2hhZG93ZWQgbm9uLWVudW1lcmFibGVcbiAgICAgICAgICAvLyBwcm9wZXJ0aWVzLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHksIGxlbmd0aDtcbiAgICAgICAgICAgIHZhciBoYXNQcm9wZXJ0eSA9ICFpc0Z1bmN0aW9uICYmIHR5cGVvZiBvYmplY3QuY29uc3RydWN0b3IgIT0gXCJmdW5jdGlvblwiICYmIG9iamVjdFR5cGVzW3R5cGVvZiBvYmplY3QuaGFzT3duUHJvcGVydHldICYmIG9iamVjdC5oYXNPd25Qcm9wZXJ0eSB8fCBpc1Byb3BlcnR5O1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gR2Vja28gPD0gMS4wIGVudW1lcmF0ZXMgdGhlIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyB1bmRlclxuICAgICAgICAgICAgICAvLyBjZXJ0YWluIGNvbmRpdGlvbnM7IElFIGRvZXMgbm90LlxuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIGVhY2ggbm9uLWVudW1lcmFibGUgcHJvcGVydHkuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IG1lbWJlcnMubGVuZ3RoOyBwcm9wZXJ0eSA9IG1lbWJlcnNbLS1sZW5ndGhdOyBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmIGNhbGxiYWNrKHByb3BlcnR5KSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChzaXplID09IDIpIHtcbiAgICAgICAgICAvLyBTYWZhcmkgPD0gMi4wLjQgZW51bWVyYXRlcyBzaGFkb3dlZCBwcm9wZXJ0aWVzIHR3aWNlLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgc2V0IG9mIGl0ZXJhdGVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9LCBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5O1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gU3RvcmUgZWFjaCBwcm9wZXJ0eSBuYW1lIHRvIHByZXZlbnQgZG91YmxlIGVudW1lcmF0aW9uLiBUaGVcbiAgICAgICAgICAgICAgLy8gYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIGlzIG5vdCBlbnVtZXJhdGVkIGR1ZSB0byBjcm9zcy1cbiAgICAgICAgICAgICAgLy8gZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmICFpc1Byb3BlcnR5LmNhbGwobWVtYmVycywgcHJvcGVydHkpICYmIChtZW1iZXJzW3Byb3BlcnR5XSA9IDEpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gYnVncyBkZXRlY3RlZDsgdXNlIHRoZSBzdGFuZGFyZCBgZm9yLi4uaW5gIGFsZ29yaXRobS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBpc0NvbnN0cnVjdG9yO1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgIShpc0NvbnN0cnVjdG9yID0gcHJvcGVydHkgPT09IFwiY29uc3RydWN0b3JcIikpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IGR1ZSB0b1xuICAgICAgICAgICAgLy8gY3Jvc3MtZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgaWYgKGlzQ29uc3RydWN0b3IgfHwgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgKHByb3BlcnR5ID0gXCJjb25zdHJ1Y3RvclwiKSkpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvckVhY2gob2JqZWN0LCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAvLyBQdWJsaWM6IFNlcmlhbGl6ZXMgYSBKYXZhU2NyaXB0IGB2YWx1ZWAgYXMgYSBKU09OIHN0cmluZy4gVGhlIG9wdGlvbmFsXG4gICAgICAvLyBgZmlsdGVyYCBhcmd1bWVudCBtYXkgc3BlY2lmeSBlaXRoZXIgYSBmdW5jdGlvbiB0aGF0IGFsdGVycyBob3cgb2JqZWN0IGFuZFxuICAgICAgLy8gYXJyYXkgbWVtYmVycyBhcmUgc2VyaWFsaXplZCwgb3IgYW4gYXJyYXkgb2Ygc3RyaW5ncyBhbmQgbnVtYmVycyB0aGF0XG4gICAgICAvLyBpbmRpY2F0ZXMgd2hpY2ggcHJvcGVydGllcyBzaG91bGQgYmUgc2VyaWFsaXplZC4gVGhlIG9wdGlvbmFsIGB3aWR0aGBcbiAgICAgIC8vIGFyZ3VtZW50IG1heSBiZSBlaXRoZXIgYSBzdHJpbmcgb3IgbnVtYmVyIHRoYXQgc3BlY2lmaWVzIHRoZSBpbmRlbnRhdGlvblxuICAgICAgLy8gbGV2ZWwgb2YgdGhlIG91dHB1dC5cbiAgICAgIGlmICh0cnVlKSB7XG4gICAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuXG4gICAgICAgIHZhciBFc2NhcGVzID0ge1xuICAgICAgICAgIDkyOiBcIlxcXFxcXFxcXCIsXG4gICAgICAgICAgMzQ6ICdcXFxcXCInLFxuICAgICAgICAgIDg6IFwiXFxcXGJcIixcbiAgICAgICAgICAxMjogXCJcXFxcZlwiLFxuICAgICAgICAgIDEwOiBcIlxcXFxuXCIsXG4gICAgICAgICAgMTM6IFwiXFxcXHJcIixcbiAgICAgICAgICA5OiBcIlxcXFx0XCJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogQ29udmVydHMgYHZhbHVlYCBpbnRvIGEgemVyby1wYWRkZWQgc3RyaW5nIHN1Y2ggdGhhdCBpdHNcbiAgICAgICAgLy8gbGVuZ3RoIGlzIGF0IGxlYXN0IGVxdWFsIHRvIGB3aWR0aGAuIFRoZSBgd2lkdGhgIG11c3QgYmUgPD0gNi5cbiAgICAgICAgdmFyIGxlYWRpbmdaZXJvZXMgPSBcIjAwMDAwMFwiO1xuICAgICAgICB2YXIgdG9QYWRkZWRTdHJpbmcgPSBmdW5jdGlvbiAod2lkdGgsIHZhbHVlKSB7XG4gICAgICAgICAgLy8gVGhlIGB8fCAwYCBleHByZXNzaW9uIGlzIG5lY2Vzc2FyeSB0byB3b3JrIGFyb3VuZCBhIGJ1ZyBpblxuICAgICAgICAgIC8vIE9wZXJhIDw9IDcuNTR1MiB3aGVyZSBgMCA9PSAtMGAsIGJ1dCBgU3RyaW5nKC0wKSAhPT0gXCIwXCJgLlxuICAgICAgICAgIHJldHVybiAobGVhZGluZ1plcm9lcyArICh2YWx1ZSB8fCAwKSkuc2xpY2UoLXdpZHRoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogRG91YmxlLXF1b3RlcyBhIHN0cmluZyBgdmFsdWVgLCByZXBsYWNpbmcgYWxsIEFTQ0lJIGNvbnRyb2xcbiAgICAgICAgLy8gY2hhcmFjdGVycyAoY2hhcmFjdGVycyB3aXRoIGNvZGUgdW5pdCB2YWx1ZXMgYmV0d2VlbiAwIGFuZCAzMSkgd2l0aFxuICAgICAgICAvLyB0aGVpciBlc2NhcGVkIGVxdWl2YWxlbnRzLiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZVxuICAgICAgICAvLyBgUXVvdGUodmFsdWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLlxuICAgICAgICB2YXIgdW5pY29kZVByZWZpeCA9IFwiXFxcXHUwMFwiO1xuICAgICAgICB2YXIgcXVvdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gJ1wiJywgaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGgsIHVzZUNoYXJJbmRleCA9ICFjaGFySW5kZXhCdWdneSB8fCBsZW5ndGggPiAxMDtcbiAgICAgICAgICB2YXIgc3ltYm9scyA9IHVzZUNoYXJJbmRleCAmJiAoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5zcGxpdChcIlwiKSA6IHZhbHVlKTtcbiAgICAgICAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIHZhciBjaGFyQ29kZSA9IHZhbHVlLmNoYXJDb2RlQXQoaW5kZXgpO1xuICAgICAgICAgICAgLy8gSWYgdGhlIGNoYXJhY3RlciBpcyBhIGNvbnRyb2wgY2hhcmFjdGVyLCBhcHBlbmQgaXRzIFVuaWNvZGUgb3JcbiAgICAgICAgICAgIC8vIHNob3J0aGFuZCBlc2NhcGUgc2VxdWVuY2U7IG90aGVyd2lzZSwgYXBwZW5kIHRoZSBjaGFyYWN0ZXIgYXMtaXMuXG4gICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgIGNhc2UgODogY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEyOiBjYXNlIDEzOiBjYXNlIDM0OiBjYXNlIDkyOlxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBFc2NhcGVzW2NoYXJDb2RlXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ICs9IHVuaWNvZGVQcmVmaXggKyB0b1BhZGRlZFN0cmluZygyLCBjaGFyQ29kZS50b1N0cmluZygxNikpO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSB1c2VDaGFySW5kZXggPyBzeW1ib2xzW2luZGV4XSA6IHZhbHVlLmNoYXJBdChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQgKyAnXCInO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZWN1cnNpdmVseSBzZXJpYWxpemVzIGFuIG9iamVjdC4gSW1wbGVtZW50cyB0aGVcbiAgICAgICAgLy8gYFN0cihrZXksIGhvbGRlcilgLCBgSk8odmFsdWUpYCwgYW5kIGBKQSh2YWx1ZSlgIG9wZXJhdGlvbnMuXG4gICAgICAgIHZhciBzZXJpYWxpemUgPSBmdW5jdGlvbiAocHJvcGVydHksIG9iamVjdCwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLCBzdGFjaywgbWF4TGluZUxlbmd0aCkge1xuICAgICAgICAgIHZhciB2YWx1ZSwgY2xhc3NOYW1lLCB5ZWFyLCBtb250aCwgZGF0ZSwgdGltZSwgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIG1pbGxpc2Vjb25kcywgcmVzdWx0cywgZWxlbWVudCwgaW5kZXgsIGxlbmd0aCwgcHJlZml4LCByZXN1bHQ7XG5cbiAgICAgICAgICBtYXhMaW5lTGVuZ3RoID0gbWF4TGluZUxlbmd0aCB8fCAwO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIE5lY2Vzc2FyeSBmb3IgaG9zdCBvYmplY3Qgc3VwcG9ydC5cbiAgICAgICAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICAgICAgICBjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKTtcbiAgICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gZGF0ZUNsYXNzICYmICFpc1Byb3BlcnR5LmNhbGwodmFsdWUsIFwidG9KU09OXCIpKSB7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwKSB7XG4gICAgICAgICAgICAgICAgLy8gRGF0ZXMgYXJlIHNlcmlhbGl6ZWQgYWNjb3JkaW5nIHRvIHRoZSBgRGF0ZSN0b0pTT05gIG1ldGhvZFxuICAgICAgICAgICAgICAgIC8vIHNwZWNpZmllZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS45LjUuNDQuIFNlZSBzZWN0aW9uIDE1LjkuMS4xNVxuICAgICAgICAgICAgICAgIC8vIGZvciB0aGUgSVNPIDg2MDEgZGF0ZSB0aW1lIHN0cmluZyBmb3JtYXQuXG4gICAgICAgICAgICAgICAgaWYgKGdldERheSkge1xuICAgICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29tcHV0ZSB0aGUgeWVhciwgbW9udGgsIGRhdGUsIGhvdXJzLCBtaW51dGVzLFxuICAgICAgICAgICAgICAgICAgLy8gc2Vjb25kcywgYW5kIG1pbGxpc2Vjb25kcyBpZiB0aGUgYGdldFVUQypgIG1ldGhvZHMgYXJlXG4gICAgICAgICAgICAgICAgICAvLyBidWdneS4gQWRhcHRlZCBmcm9tIEBZYWZmbGUncyBgZGF0ZS1zaGltYCBwcm9qZWN0LlxuICAgICAgICAgICAgICAgICAgZGF0ZSA9IGZsb29yKHZhbHVlIC8gODY0ZTUpO1xuICAgICAgICAgICAgICAgICAgZm9yICh5ZWFyID0gZmxvb3IoZGF0ZSAvIDM2NS4yNDI1KSArIDE5NzAgLSAxOyBnZXREYXkoeWVhciArIDEsIDApIDw9IGRhdGU7IHllYXIrKyk7XG4gICAgICAgICAgICAgICAgICBmb3IgKG1vbnRoID0gZmxvb3IoKGRhdGUgLSBnZXREYXkoeWVhciwgMCkpIC8gMzAuNDIpOyBnZXREYXkoeWVhciwgbW9udGggKyAxKSA8PSBkYXRlOyBtb250aCsrKTtcbiAgICAgICAgICAgICAgICAgIGRhdGUgPSAxICsgZGF0ZSAtIGdldERheSh5ZWFyLCBtb250aCk7XG4gICAgICAgICAgICAgICAgICAvLyBUaGUgYHRpbWVgIHZhbHVlIHNwZWNpZmllcyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheSAoc2VlIEVTXG4gICAgICAgICAgICAgICAgICAvLyA1LjEgc2VjdGlvbiAxNS45LjEuMikuIFRoZSBmb3JtdWxhIGAoQSAlIEIgKyBCKSAlIEJgIGlzIHVzZWRcbiAgICAgICAgICAgICAgICAgIC8vIHRvIGNvbXB1dGUgYEEgbW9kdWxvIEJgLCBhcyB0aGUgYCVgIG9wZXJhdG9yIGRvZXMgbm90XG4gICAgICAgICAgICAgICAgICAvLyBjb3JyZXNwb25kIHRvIHRoZSBgbW9kdWxvYCBvcGVyYXRpb24gZm9yIG5lZ2F0aXZlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgICB0aW1lID0gKHZhbHVlICUgODY0ZTUgKyA4NjRlNSkgJSA4NjRlNTtcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBob3VycywgbWludXRlcywgc2Vjb25kcywgYW5kIG1pbGxpc2Vjb25kcyBhcmUgb2J0YWluZWQgYnlcbiAgICAgICAgICAgICAgICAgIC8vIGRlY29tcG9zaW5nIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5LiBTZWUgc2VjdGlvbiAxNS45LjEuMTAuXG4gICAgICAgICAgICAgICAgICBob3VycyA9IGZsb29yKHRpbWUgLyAzNmU1KSAlIDI0O1xuICAgICAgICAgICAgICAgICAgbWludXRlcyA9IGZsb29yKHRpbWUgLyA2ZTQpICUgNjA7XG4gICAgICAgICAgICAgICAgICBzZWNvbmRzID0gZmxvb3IodGltZSAvIDFlMykgJSA2MDtcbiAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IHRpbWUgJSAxZTM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHllYXIgPSB2YWx1ZS5nZXRVVENGdWxsWWVhcigpO1xuICAgICAgICAgICAgICAgICAgbW9udGggPSB2YWx1ZS5nZXRVVENNb250aCgpO1xuICAgICAgICAgICAgICAgICAgZGF0ZSA9IHZhbHVlLmdldFVUQ0RhdGUoKTtcbiAgICAgICAgICAgICAgICAgIGhvdXJzID0gdmFsdWUuZ2V0VVRDSG91cnMoKTtcbiAgICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB2YWx1ZS5nZXRVVENNaW51dGVzKCk7XG4gICAgICAgICAgICAgICAgICBzZWNvbmRzID0gdmFsdWUuZ2V0VVRDU2Vjb25kcygpO1xuICAgICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdmFsdWUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycyBjb3JyZWN0bHkuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSAoeWVhciA8PSAwIHx8IHllYXIgPj0gMWU0ID8gKHllYXIgPCAwID8gXCItXCIgOiBcIitcIikgKyB0b1BhZGRlZFN0cmluZyg2LCB5ZWFyIDwgMCA/IC15ZWFyIDogeWVhcikgOiB0b1BhZGRlZFN0cmluZyg0LCB5ZWFyKSkgK1xuICAgICAgICAgICAgICAgICAgXCItXCIgKyB0b1BhZGRlZFN0cmluZygyLCBtb250aCArIDEpICsgXCItXCIgKyB0b1BhZGRlZFN0cmluZygyLCBkYXRlKSArXG4gICAgICAgICAgICAgICAgICAvLyBNb250aHMsIGRhdGVzLCBob3VycywgbWludXRlcywgYW5kIHNlY29uZHMgc2hvdWxkIGhhdmUgdHdvXG4gICAgICAgICAgICAgICAgICAvLyBkaWdpdHM7IG1pbGxpc2Vjb25kcyBzaG91bGQgaGF2ZSB0aHJlZS5cbiAgICAgICAgICAgICAgICAgIFwiVFwiICsgdG9QYWRkZWRTdHJpbmcoMiwgaG91cnMpICsgXCI6XCIgKyB0b1BhZGRlZFN0cmluZygyLCBtaW51dGVzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgc2Vjb25kcykgK1xuICAgICAgICAgICAgICAgICAgLy8gTWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LjAsIGJ1dCByZXF1aXJlZCBpbiA1LjEuXG4gICAgICAgICAgICAgICAgICBcIi5cIiArIHRvUGFkZGVkU3RyaW5nKDMsIG1pbGxpc2Vjb25kcykgKyBcIlpcIjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlLnRvSlNPTiA9PSBcImZ1bmN0aW9uXCIgJiYgKChjbGFzc05hbWUgIT0gbnVtYmVyQ2xhc3MgJiYgY2xhc3NOYW1lICE9IHN0cmluZ0NsYXNzICYmIGNsYXNzTmFtZSAhPSBhcnJheUNsYXNzKSB8fCBpc1Byb3BlcnR5LmNhbGwodmFsdWUsIFwidG9KU09OXCIpKSkge1xuICAgICAgICAgICAgICAvLyBQcm90b3R5cGUgPD0gMS42LjEgYWRkcyBub24tc3RhbmRhcmQgYHRvSlNPTmAgbWV0aG9kcyB0byB0aGVcbiAgICAgICAgICAgICAgLy8gYE51bWJlcmAsIGBTdHJpbmdgLCBgRGF0ZWAsIGFuZCBgQXJyYXlgIHByb3RvdHlwZXMuIEpTT04gM1xuICAgICAgICAgICAgICAvLyBpZ25vcmVzIGFsbCBgdG9KU09OYCBtZXRob2RzIG9uIHRoZXNlIG9iamVjdHMgdW5sZXNzIHRoZXkgYXJlXG4gICAgICAgICAgICAgIC8vIGRlZmluZWQgZGlyZWN0bHkgb24gYW4gaW5zdGFuY2UuXG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9KU09OKHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHJlcGxhY2VtZW50IGZ1bmN0aW9uIHdhcyBwcm92aWRlZCwgY2FsbCBpdCB0byBvYnRhaW4gdGhlIHZhbHVlXG4gICAgICAgICAgICAvLyBmb3Igc2VyaWFsaXphdGlvbi5cbiAgICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2suY2FsbChvYmplY3QsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwibnVsbFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKTtcbiAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGJvb2xlYW5DbGFzcykge1xuICAgICAgICAgICAgLy8gQm9vbGVhbnMgYXJlIHJlcHJlc2VudGVkIGxpdGVyYWxseS5cbiAgICAgICAgICAgIHJldHVybiBcIlwiICsgdmFsdWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gbnVtYmVyQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIEpTT04gbnVtYmVycyBtdXN0IGJlIGZpbml0ZS4gYEluZmluaXR5YCBhbmQgYE5hTmAgYXJlIHNlcmlhbGl6ZWQgYXNcbiAgICAgICAgICAgIC8vIGBcIm51bGxcImAuXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCA/IFwiXCIgKyB2YWx1ZSA6IFwibnVsbFwiO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzKSB7XG4gICAgICAgICAgICAvLyBTdHJpbmdzIGFyZSBkb3VibGUtcXVvdGVkIGFuZCBlc2NhcGVkLlxuICAgICAgICAgICAgcmV0dXJuIHF1b3RlKFwiXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoaXMgaXMgYSBsaW5lYXIgc2VhcmNoOyBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgLy8gaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mIHVuaXF1ZSBuZXN0ZWQgb2JqZWN0cy5cbiAgICAgICAgICAgIGZvciAobGVuZ3RoID0gc3RhY2subGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICAgICAgaWYgKHN0YWNrW2xlbmd0aF0gPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3ljbGljIHN0cnVjdHVyZXMgY2Fubm90IGJlIHNlcmlhbGl6ZWQgYnkgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWRkIHRoZSBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IGluZGVudGF0aW9uIGxldmVsIGFuZCBpbmRlbnQgb25lIGFkZGl0aW9uYWwgbGV2ZWwuXG4gICAgICAgICAgICBwcmVmaXggPSBpbmRlbnRhdGlvbjtcbiAgICAgICAgICAgIGluZGVudGF0aW9uICs9IHdoaXRlc3BhY2U7XG4gICAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gaW5kZW50YXRpb24ubGVuZ3RoLCByZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBhcnJheSBlbGVtZW50cy5cbiAgICAgICAgICAgICAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gc2VyaWFsaXplKGluZGV4LCB2YWx1ZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLFxuICAgICAgICAgICAgICAgICAgc3RhY2ssIG1heExpbmVMZW5ndGgpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnQgPT09IHVuZGVmID8gXCJudWxsXCIgOiBlbGVtZW50O1xuICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IHJlc3VsdC5sZW5ndGggKyAoaW5kZXggPiAwID8gMSA6IDApO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdHMubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlICYmICh0b3RhbExlbmd0aCA+IG1heExpbmVMZW5ndGgpID9cbiAgICAgICAgICAgICAgICAgIFwiW1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJdXCIgOlxuICAgICAgICAgICAgICAgICAgXCJbXCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJdXCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgOiBcIltdXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBpbmRlbnRhdGlvbi5sZW5ndGgsIGluZGV4PTA7XG4gICAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3QgbWVtYmVycy4gTWVtYmVycyBhcmUgc2VsZWN0ZWQgZnJvbVxuICAgICAgICAgICAgICAvLyBlaXRoZXIgYSB1c2VyLXNwZWNpZmllZCBsaXN0IG9mIHByb3BlcnR5IG5hbWVzLCBvciB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgIC8vIGl0c2VsZi5cbiAgICAgICAgICAgICAgZm9yRWFjaChwcm9wZXJ0aWVzIHx8IHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0LCBlbGVtZW50ID0gc2VyaWFsaXplKHByb3BlcnR5LCB2YWx1ZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZikge1xuICAgICAgICAgICAgICAgICAgLy8gQWNjb3JkaW5nIHRvIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjM6IFwiSWYgYGdhcGAge3doaXRlc3BhY2V9XG4gICAgICAgICAgICAgICAgICAvLyBpcyBub3QgdGhlIGVtcHR5IHN0cmluZywgbGV0IGBtZW1iZXJgIHtxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIn1cbiAgICAgICAgICAgICAgICAgIC8vIGJlIHRoZSBjb25jYXRlbmF0aW9uIG9mIGBtZW1iZXJgIGFuZCB0aGUgYHNwYWNlYCBjaGFyYWN0ZXIuXCJcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBcImBzcGFjZWAgY2hhcmFjdGVyXCIgcmVmZXJzIHRvIHRoZSBsaXRlcmFsIHNwYWNlXG4gICAgICAgICAgICAgICAgICAvLyBjaGFyYWN0ZXIsIG5vdCB0aGUgYHNwYWNlYCB7d2lkdGh9IGFyZ3VtZW50IHByb3ZpZGVkIHRvXG4gICAgICAgICAgICAgICAgICAvLyBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcXVvdGUocHJvcGVydHkpICsgXCI6XCIgKyAod2hpdGVzcGFjZSA/IFwiIFwiIDogXCJcIikgKyBlbGVtZW50O1xuICAgICAgICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gcmVzdWx0Lmxlbmd0aCArIChpbmRleCsrID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdHMubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlICYmICh0b3RhbExlbmd0aCA+IG1heExpbmVMZW5ndGgpID9cbiAgICAgICAgICAgICAgICAgIFwie1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJ9XCIgOlxuICAgICAgICAgICAgICAgICAgXCJ7XCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJ9XCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgOiBcInt9XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIG9iamVjdCBmcm9tIHRoZSB0cmF2ZXJzZWQgb2JqZWN0IHN0YWNrLlxuICAgICAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdWJsaWM6IGBKU09OLnN0cmluZ2lmeWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLlxuXG4gICAgICAgIGV4cG9ydHMuc3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCwgbWF4TGluZUxlbmd0aCkge1xuICAgICAgICAgIHZhciB3aGl0ZXNwYWNlLCBjYWxsYmFjaywgcHJvcGVydGllcywgY2xhc3NOYW1lO1xuICAgICAgICAgIGlmIChvYmplY3RUeXBlc1t0eXBlb2YgZmlsdGVyXSAmJiBmaWx0ZXIpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbChmaWx0ZXIpKSA9PSBmdW5jdGlvbkNsYXNzKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrID0gZmlsdGVyO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBwcm9wZXJ0eSBuYW1lcyBhcnJheSBpbnRvIGEgbWFrZXNoaWZ0IHNldC5cbiAgICAgICAgICAgICAgcHJvcGVydGllcyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbmd0aCA9IGZpbHRlci5sZW5ndGgsIHZhbHVlOyBpbmRleCA8IGxlbmd0aDsgdmFsdWUgPSBmaWx0ZXJbaW5kZXgrK10sICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkpLCBjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MgfHwgY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSAmJiAocHJvcGVydGllc1t2YWx1ZV0gPSAxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh3aWR0aCkge1xuICAgICAgICAgICAgaWYgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHdpZHRoKSkgPT0gbnVtYmVyQ2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgYHdpZHRoYCB0byBhbiBpbnRlZ2VyIGFuZCBjcmVhdGUgYSBzdHJpbmcgY29udGFpbmluZ1xuICAgICAgICAgICAgICAvLyBgd2lkdGhgIG51bWJlciBvZiBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICBpZiAoKHdpZHRoIC09IHdpZHRoICUgMSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yICh3aGl0ZXNwYWNlID0gXCJcIiwgd2lkdGggPiAxMCAmJiAod2lkdGggPSAxMCk7IHdoaXRlc3BhY2UubGVuZ3RoIDwgd2lkdGg7IHdoaXRlc3BhY2UgKz0gXCIgXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgICB3aGl0ZXNwYWNlID0gd2lkdGgubGVuZ3RoIDw9IDEwID8gd2lkdGggOiB3aWR0aC5zbGljZSgwLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE9wZXJhIDw9IDcuNTR1MiBkaXNjYXJkcyB0aGUgdmFsdWVzIGFzc29jaWF0ZWQgd2l0aCBlbXB0eSBzdHJpbmcga2V5c1xuICAgICAgICAgIC8vIChgXCJcImApIG9ubHkgaWYgdGhleSBhcmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gYW4gb2JqZWN0IG1lbWJlciBsaXN0XG4gICAgICAgICAgLy8gKGUuZy4sIGAhKFwiXCIgaW4geyBcIlwiOiAxfSlgKS5cbiAgICAgICAgICByZXR1cm4gc2VyaWFsaXplKFwiXCIsICh2YWx1ZSA9IHt9LCB2YWx1ZVtcIlwiXSA9IHNvdXJjZSwgdmFsdWUpLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgXCJcIiwgW10sIG1heExpbmVMZW5ndGgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGV4cG9ydHMuY29tcGFjdFN0cmluZ2lmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGZpbHRlciwgd2lkdGgpe1xuICAgICAgICAgIHJldHVybiBleHBvcnRzLnN0cmluZ2lmeShzb3VyY2UsIGZpbHRlciwgd2lkdGgsIDYwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBQdWJsaWM6IFBhcnNlcyBhIEpTT04gc291cmNlIHN0cmluZy5cbiAgICAgIGlmICghaGFzKFwianNvbi1wYXJzZVwiKSkge1xuICAgICAgICB2YXIgZnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIHVuZXNjYXBlZFxuICAgICAgICAvLyBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIFVuZXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXCIsXG4gICAgICAgICAgMzQ6ICdcIicsXG4gICAgICAgICAgNDc6IFwiL1wiLFxuICAgICAgICAgIDk4OiBcIlxcYlwiLFxuICAgICAgICAgIDExNjogXCJcXHRcIixcbiAgICAgICAgICAxMTA6IFwiXFxuXCIsXG4gICAgICAgICAgMTAyOiBcIlxcZlwiLFxuICAgICAgICAgIDExNDogXCJcXHJcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBTdG9yZXMgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICAgICAgdmFyIEluZGV4LCBTb3VyY2U7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlc2V0cyB0aGUgcGFyc2VyIHN0YXRlIGFuZCB0aHJvd3MgYSBgU3ludGF4RXJyb3JgLlxuICAgICAgICB2YXIgYWJvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgSW5kZXggPSBTb3VyY2UgPSBudWxsO1xuICAgICAgICAgIHRocm93IFN5bnRheEVycm9yKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJldHVybnMgdGhlIG5leHQgdG9rZW4sIG9yIGBcIiRcImAgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZFxuICAgICAgICAvLyB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLiBBIHRva2VuIG1heSBiZSBhIHN0cmluZywgbnVtYmVyLCBgbnVsbGBcbiAgICAgICAgLy8gbGl0ZXJhbCwgb3IgQm9vbGVhbiBsaXRlcmFsLlxuICAgICAgICB2YXIgbGV4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBzb3VyY2UgPSBTb3VyY2UsIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGgsIHZhbHVlLCBiZWdpbiwgcG9zaXRpb24sIGlzU2lnbmVkLCBjaGFyQ29kZTtcbiAgICAgICAgICB3aGlsZSAoSW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTM6IGNhc2UgMzI6XG4gICAgICAgICAgICAgICAgLy8gU2tpcCB3aGl0ZXNwYWNlIHRva2VucywgaW5jbHVkaW5nIHRhYnMsIGNhcnJpYWdlIHJldHVybnMsIGxpbmVcbiAgICAgICAgICAgICAgICAvLyBmZWVkcywgYW5kIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAxMjM6IGNhc2UgMTI1OiBjYXNlIDkxOiBjYXNlIDkzOiBjYXNlIDU4OiBjYXNlIDQ0OlxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGEgcHVuY3R1YXRvciB0b2tlbiAoYHtgLCBgfWAsIGBbYCwgYF1gLCBgOmAsIG9yIGAsYCkgYXRcbiAgICAgICAgICAgICAgICAvLyB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGNoYXJJbmRleEJ1Z2d5ID8gc291cmNlLmNoYXJBdChJbmRleCkgOiBzb3VyY2VbSW5kZXhdO1xuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICBjYXNlIDM0OlxuICAgICAgICAgICAgICAgIC8vIGBcImAgZGVsaW1pdHMgYSBKU09OIHN0cmluZzsgYWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kXG4gICAgICAgICAgICAgICAgLy8gYmVnaW4gcGFyc2luZyB0aGUgc3RyaW5nLiBTdHJpbmcgdG9rZW5zIGFyZSBwcmVmaXhlZCB3aXRoIHRoZVxuICAgICAgICAgICAgICAgIC8vIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIgdG8gZGlzdGluZ3Vpc2ggdGhlbSBmcm9tIHB1bmN0dWF0b3JzIGFuZFxuICAgICAgICAgICAgICAgIC8vIGVuZC1vZi1zdHJpbmcgdG9rZW5zLlxuICAgICAgICAgICAgICAgIGZvciAodmFsdWUgPSBcIkBcIiwgSW5kZXgrKzsgSW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVuZXNjYXBlZCBBU0NJSSBjb250cm9sIGNoYXJhY3RlcnMgKHRob3NlIHdpdGggYSBjb2RlIHVuaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gbGVzcyB0aGFuIHRoZSBzcGFjZSBjaGFyYWN0ZXIpIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFyQ29kZSA9PSA5Mikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIHJldmVyc2Ugc29saWR1cyAoYFxcYCkgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhbiBlc2NhcGVkXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRyb2wgY2hhcmFjdGVyIChpbmNsdWRpbmcgYFwiYCwgYFxcYCwgYW5kIGAvYCkgb3IgVW5pY29kZVxuICAgICAgICAgICAgICAgICAgICAvLyBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIDkyOiBjYXNlIDM0OiBjYXNlIDQ3OiBjYXNlIDk4OiBjYXNlIDExNjogY2FzZSAxMTA6IGNhc2UgMTAyOiBjYXNlIDExNDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IFVuZXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSAxMTc6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBgXFx1YCBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIGEgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBmaXJzdCBjaGFyYWN0ZXIgYW5kIHZhbGlkYXRlIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm91ci1kaWdpdCBjb2RlIHBvaW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgYmVnaW4gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4ICsgNDsgSW5kZXggPCBwb3NpdGlvbjsgSW5kZXgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQSB2YWxpZCBzZXF1ZW5jZSBjb21wcmlzZXMgZm91ciBoZXhkaWdpdHMgKGNhc2UtXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluc2Vuc2l0aXZlKSB0aGF0IGZvcm0gYSBzaW5nbGUgaGV4YWRlY2ltYWwgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3IHx8IGNoYXJDb2RlID49IDk3ICYmIGNoYXJDb2RlIDw9IDEwMiB8fCBjaGFyQ29kZSA+PSA2NSAmJiBjaGFyQ29kZSA8PSA3MCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSB0aGUgZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBmcm9tQ2hhckNvZGUoXCIweFwiICsgc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDM0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gQW4gdW5lc2NhcGVkIGRvdWJsZS1xdW90ZSBjaGFyYWN0ZXIgbWFya3MgdGhlIGVuZCBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9wdGltaXplIGZvciB0aGUgY29tbW9uIGNhc2Ugd2hlcmUgYSBzdHJpbmcgaXMgdmFsaWQuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjaGFyQ29kZSA+PSAzMiAmJiBjaGFyQ29kZSAhPSA5MiAmJiBjaGFyQ29kZSAhPSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIHRoZSBzdHJpbmcgYXMtaXMuXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDM0KSB7XG4gICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmQgcmV0dXJuIHRoZSByZXZpdmVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFVudGVybWluYXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBudW1iZXJzIGFuZCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgcGFzdCB0aGUgbmVnYXRpdmUgc2lnbiwgaWYgb25lIGlzIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGFuIGludGVnZXIgb3IgZmxvYXRpbmctcG9pbnQgdmFsdWUuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSB7XG4gICAgICAgICAgICAgICAgICAvLyBMZWFkaW5nIHplcm9lcyBhcmUgaW50ZXJwcmV0ZWQgYXMgb2N0YWwgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4ICsgMSkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBvY3RhbCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaXNTaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBpbnRlZ2VyIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgIGZvciAoOyBJbmRleCA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBJbmRleCsrKTtcbiAgICAgICAgICAgICAgICAgIC8vIEZsb2F0cyBjYW5ub3QgY29udGFpbiBhIGxlYWRpbmcgZGVjaW1hbCBwb2ludDsgaG93ZXZlciwgdGhpc1xuICAgICAgICAgICAgICAgICAgLy8gY2FzZSBpcyBhbHJlYWR5IGFjY291bnRlZCBmb3IgYnkgdGhlIHBhcnNlci5cbiAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gNDYpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgZGVjaW1hbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQocG9zaXRpb24pKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCB0cmFpbGluZyBkZWNpbWFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIGV4cG9uZW50cy4gVGhlIGBlYCBkZW5vdGluZyB0aGUgZXhwb25lbnQgaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UtaW5zZW5zaXRpdmUuXG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAxMDEgfHwgY2hhckNvZGUgPT0gNjkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBwYXN0IHRoZSBzaWduIGZvbGxvd2luZyB0aGUgZXhwb25lbnQsIGlmIG9uZSBpc1xuICAgICAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0MyB8fCBjaGFyQ29kZSA9PSA0NSkge1xuICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGV4cG9uZW50aWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4OyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQocG9zaXRpb24pKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBlbXB0eSBleHBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBDb2VyY2UgdGhlIHBhcnNlZCB2YWx1ZSB0byBhIEphdmFTY3JpcHQgbnVtYmVyLlxuICAgICAgICAgICAgICAgICAgcmV0dXJuICtzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gQSBuZWdhdGl2ZSBzaWduIG1heSBvbmx5IHByZWNlZGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBpZiAoaXNTaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGB0cnVlYCwgYGZhbHNlYCwgYW5kIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNSkgPT0gXCJmYWxzZVwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA1O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwibnVsbFwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFVucmVjb2duaXplZCB0b2tlbi5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXR1cm4gdGhlIHNlbnRpbmVsIGAkYCBjaGFyYWN0ZXIgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZCB0aGUgZW5kXG4gICAgICAgICAgLy8gb2YgdGhlIHNvdXJjZSBzdHJpbmcuXG4gICAgICAgICAgcmV0dXJuIFwiJFwiO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBQYXJzZXMgYSBKU09OIGB2YWx1ZWAgdG9rZW4uXG4gICAgICAgIHZhciBnZXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0cywgaGFzTWVtYmVycztcbiAgICAgICAgICBpZiAodmFsdWUgPT0gXCIkXCIpIHtcbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgZW5kIG9mIGlucHV0LlxuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBpZiAoKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KDApIDogdmFsdWVbMF0pID09IFwiQFwiKSB7XG4gICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgc2VudGluZWwgYEBgIGNoYXJhY3Rlci5cbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUGFyc2Ugb2JqZWN0IGFuZCBhcnJheSBsaXRlcmFscy5cbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIltcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIGFycmF5LCByZXR1cm5pbmcgYSBuZXcgSmF2YVNjcmlwdCBhcnJheS5cbiAgICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgLy8gQSBjbG9zaW5nIHNxdWFyZSBicmFja2V0IG1hcmtzIHRoZSBlbmQgb2YgdGhlIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGFycmF5IGxpdGVyYWwgY29udGFpbnMgZWxlbWVudHMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdGluZyB0aGUgcHJldmlvdXMgZWxlbWVudCBmcm9tIHRoZVxuICAgICAgICAgICAgICAgIC8vIG5leHQuXG4gICAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBhcnJheSBlbGVtZW50LlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBFbGlzaW9ucyBhbmQgbGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZ2V0KHZhbHVlKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09IFwie1wiKSB7XG4gICAgICAgICAgICAgIC8vIFBhcnNlcyBhIEpTT04gb2JqZWN0LCByZXR1cm5pbmcgYSBuZXcgSmF2YVNjcmlwdCBvYmplY3QuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBjdXJseSBicmFjZSBtYXJrcyB0aGUgZW5kIG9mIHRoZSBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgb2JqZWN0IGxpdGVyYWwgY29udGFpbnMgbWVtYmVycywgdGhlIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgYSBjb21tYSBzZXBhcmF0b3IuXG4gICAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggb2JqZWN0IG1lbWJlci5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gTGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQsIG9iamVjdCBwcm9wZXJ0eSBuYW1lcyBtdXN0IGJlXG4gICAgICAgICAgICAgICAgLy8gZG91YmxlLXF1b3RlZCBzdHJpbmdzLCBhbmQgYSBgOmAgbXVzdCBzZXBhcmF0ZSBlYWNoIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgLy8gbmFtZSBhbmQgdmFsdWUuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiIHx8IHR5cGVvZiB2YWx1ZSAhPSBcInN0cmluZ1wiIHx8IChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSAhPSBcIkBcIiB8fCBsZXgoKSAhPSBcIjpcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0c1t2YWx1ZS5zbGljZSgxKV0gPSBnZXQobGV4KCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0b2tlbiBlbmNvdW50ZXJlZC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogVXBkYXRlcyBhIHRyYXZlcnNlZCBvYmplY3QgbWVtYmVyLlxuICAgICAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIGVsZW1lbnQgPSB3YWxrKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICBpZiAoZWxlbWVudCA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3VyY2VbcHJvcGVydHldID0gZWxlbWVudDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBhIHBhcnNlZCBKU09OIG9iamVjdCwgaW52b2tpbmcgdGhlXG4gICAgICAgIC8vIGBjYWxsYmFja2AgZnVuY3Rpb24gZm9yIGVhY2ggdmFsdWUuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBXYWxrKGhvbGRlciwgbmFtZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIHZhciB3YWxrID0gZnVuY3Rpb24gKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gc291cmNlW3Byb3BlcnR5XSwgbGVuZ3RoO1xuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gYGZvckVhY2hgIGNhbid0IGJlIHVzZWQgdG8gdHJhdmVyc2UgYW4gYXJyYXkgaW4gT3BlcmEgPD0gOC41NFxuICAgICAgICAgICAgLy8gYmVjYXVzZSBpdHMgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW1wbGVtZW50YXRpb24gcmV0dXJucyBgZmFsc2VgXG4gICAgICAgICAgICAvLyBmb3IgYXJyYXkgaW5kaWNlcyAoZS5nLiwgYCFbMSwgMiwgM10uaGFzT3duUHJvcGVydHkoXCIwXCIpYCkuXG4gICAgICAgICAgICBpZiAoZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKHZhbHVlLCBsZW5ndGgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm9yRWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKHZhbHVlLCBwcm9wZXJ0eSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwoc291cmNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04ucGFyc2VgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgICAgICAgZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChzb3VyY2UsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCwgdmFsdWU7XG4gICAgICAgICAgSW5kZXggPSAwO1xuICAgICAgICAgIFNvdXJjZSA9IFwiXCIgKyBzb3VyY2U7XG4gICAgICAgICAgcmVzdWx0ID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAvLyBJZiBhIEpTT04gc3RyaW5nIGNvbnRhaW5zIG11bHRpcGxlIHRva2VucywgaXQgaXMgaW52YWxpZC5cbiAgICAgICAgICBpZiAobGV4KCkgIT0gXCIkXCIpIHtcbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJlc2V0IHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgICAgSW5kZXggPSBTb3VyY2UgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayAmJiBnZXRDbGFzcy5jYWxsKGNhbGxiYWNrKSA9PSBmdW5jdGlvbkNsYXNzID8gd2FsaygodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSByZXN1bHQsIHZhbHVlKSwgXCJcIiwgY2FsbGJhY2spIDogcmVzdWx0O1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGV4cG9ydHNbXCJydW5JbkNvbnRleHRcIl0gPSBydW5JbkNvbnRleHQ7XG4gICAgcmV0dXJuIGV4cG9ydHM7XG4gIH1cblxuICBpZiAoZnJlZUV4cG9ydHMgJiYgIWlzTG9hZGVyKSB7XG4gICAgLy8gRXhwb3J0IGZvciBDb21tb25KUyBlbnZpcm9ubWVudHMuXG4gICAgcnVuSW5Db250ZXh0KHJvb3QsIGZyZWVFeHBvcnRzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBFeHBvcnQgZm9yIHdlYiBicm93c2VycyBhbmQgSmF2YVNjcmlwdCBlbmdpbmVzLlxuICAgIHZhciBuYXRpdmVKU09OID0gcm9vdC5KU09OLFxuICAgICAgICBwcmV2aW91c0pTT04gPSByb290W1wiSlNPTjNcIl0sXG4gICAgICAgIGlzUmVzdG9yZWQgPSBmYWxzZTtcblxuICAgIHZhciBKU09OMyA9IHJ1bkluQ29udGV4dChyb290LCAocm9vdFtcIkpTT04zXCJdID0ge1xuICAgICAgLy8gUHVibGljOiBSZXN0b3JlcyB0aGUgb3JpZ2luYWwgdmFsdWUgb2YgdGhlIGdsb2JhbCBgSlNPTmAgb2JqZWN0IGFuZFxuICAgICAgLy8gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgYEpTT04zYCBvYmplY3QuXG4gICAgICBcIm5vQ29uZmxpY3RcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWlzUmVzdG9yZWQpIHtcbiAgICAgICAgICBpc1Jlc3RvcmVkID0gdHJ1ZTtcbiAgICAgICAgICByb290LkpTT04gPSBuYXRpdmVKU09OO1xuICAgICAgICAgIHJvb3RbXCJKU09OM1wiXSA9IHByZXZpb3VzSlNPTjtcbiAgICAgICAgICBuYXRpdmVKU09OID0gcHJldmlvdXNKU09OID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSlNPTjM7XG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgcm9vdC5KU09OID0ge1xuICAgICAgXCJwYXJzZVwiOiBKU09OMy5wYXJzZSxcbiAgICAgIFwic3RyaW5naWZ5XCI6IEpTT04zLnN0cmluZ2lmeVxuICAgIH07XG4gIH1cblxuICAvLyBFeHBvcnQgZm9yIGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy5cbiAgaWYgKGlzTG9hZGVyKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBKU09OMztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcbiIsIid1c2Ugc3RyaWN0Jztcbi8qIGdsb2JhbHMgd2luZG93LCBhbmd1bGFyICovXG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJywgW1xuICAnTG9jYWxTdG9yYWdlTW9kdWxlJyxcbiAgJ2FuZ3VsYXItZ29vZ2xlLWFuYWx5dGljcydcbiAgXSlcbiAgLmNvbnN0YW50KCdfJywgd2luZG93Ll8pXG4gIC8vIGRhdGFsaWIsIHZlZ2FsaXRlLCB2ZWdhXG4gIC5jb25zdGFudCgnZGwnLCB3aW5kb3cuZGwpXG4gIC5jb25zdGFudCgndmwnLCB3aW5kb3cudmwpXG4gIC5jb25zdGFudCgndmcnLCB3aW5kb3cudmcpXG4gIC8vIG90aGVyIGxpYnJhcmllc1xuICAuY29uc3RhbnQoJ0Jsb2InLCB3aW5kb3cuQmxvYilcbiAgLmNvbnN0YW50KCdVUkwnLCB3aW5kb3cuVVJMKVxuICAuY29uc3RhbnQoJ0Ryb3AnLCB3aW5kb3cuRHJvcClcbiAgLmNvbnN0YW50KCdIZWFwJywgd2luZG93LkhlYXApXG4gIC8vIFVzZSB0aGUgY3VzdG9taXplZCB2ZW5kb3IvanNvbjMtY29tcGFjdHN0cmluZ2lmeVxuICAuY29uc3RhbnQoJ0pTT04zJywgd2luZG93LkpTT04zLm5vQ29uZmxpY3QoKSlcbiAgLy8gY29uc3RhbnRzXG4gIC5jb25zdGFudCgnY29uc3RzJywge1xuICAgIGFkZENvdW50OiB0cnVlLCAvLyBhZGQgY291bnQgZmllbGQgdG8gRGF0YXNldC5kYXRhc2NoZW1hXG4gICAgZGVidWc6IHRydWUsXG4gICAgdXNlVXJsOiB0cnVlLFxuICAgIGxvZ2dpbmc6IHRydWUsXG4gICAgZGVmYXVsdENvbmZpZ1NldDogJ2xhcmdlJyxcbiAgICBhcHBJZDogJ3ZsdWknLFxuICAgIC8vIGVtYmVkZGVkIHBvbGVzdGFyIGFuZCB2b3lhZ2VyIHdpdGgga25vd24gZGF0YVxuICAgIGVtYmVkZGVkRGF0YTogd2luZG93LnZndWlEYXRhIHx8IHVuZGVmaW5lZCxcbiAgICBwcmlvcml0eToge1xuICAgICAgYm9va21hcms6IDAsXG4gICAgICBwb3B1cDogMCxcbiAgICAgIHZpc2xpc3Q6IDEwMDBcbiAgICB9LFxuICAgIG15cmlhUmVzdDogJ2h0dHA6Ly9lYzItNTItMS0zOC0xODIuY29tcHV0ZS0xLmFtYXpvbmF3cy5jb206ODc1MycsXG4gICAgdHlwZU5hbWVzOiB7XG4gICAgICBOOiAndGV4dCcsXG4gICAgICBPOiAndGV4dC1vcmRpbmFsJyxcbiAgICAgIFE6ICdudW1iZXInLFxuICAgICAgVDogJ3RpbWUnLFxuICAgICAgRzogJ2dlbydcbiAgICB9XG4gIH0pXG4gIC5jb25maWcoZnVuY3Rpb24gKEFuYWx5dGljc1Byb3ZpZGVyKSB7XG4gICAgQW5hbHl0aWNzUHJvdmlkZXJcbiAgICAgIC5zZXRBY2NvdW50KHsgdHJhY2tlcjogJ1VBLTQ0NDI4NDQ2LTQnLCBuYW1lOiAndm95YWdlcicsIHRyYWNrRXZlbnQ6IHRydWUgfSk7XG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoXCJ2bHVpXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcImFsZXJ0bWVzc2FnZXMvYWxlcnRtZXNzYWdlcy5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhbGVydC1ib3hcXFwiIG5nLXNob3c9XFxcIkFsZXJ0cy5hbGVydHMubGVuZ3RoID4gMFxcXCI+PGRpdiBjbGFzcz1cXFwiYWxlcnQtaXRlbVxcXCIgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBBbGVydHMuYWxlcnRzXFxcIj57eyBhbGVydC5tc2cgfX0gPGEgY2xhc3M9XFxcImNsb3NlXFxcIiBuZy1jbGljaz1cXFwiQWxlcnRzLmNsb3NlQWxlcnQoJGluZGV4KVxcXCI+JnRpbWVzOzwvYT48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiYm9va21hcmstbGlzdFxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5pc1N1cHBvcnRlZFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyIGNhcmQgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW5cXFwiPjxtb2RhbC1jbG9zZS1idXR0b24gb24tY2xvc2U9XFxcImxvZ0Jvb2ttYXJrc0Nsb3NlZCgpXFxcIj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDIgY2xhc3M9XFxcIm5vLWJvdHRvbS1tYXJnaW5cXFwiPkJvb2ttYXJrcyAoe3sgQm9va21hcmtzLmxlbmd0aCB9fSk8L2gyPjxhIG5nLWNsaWNrPVxcXCJCb29rbWFya3MuY2xlYXIoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoLW9cXFwiPjwvaT4gQ2xlYXIgYWxsPC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZsZXgtZ3Jvdy0xIHNjcm9sbC15XFxcIj48ZGl2IG5nLWlmPVxcXCJCb29rbWFya3MubGVuZ3RoID4gMFxcXCIgY2xhc3M9XFxcImhmbGV4IGZsZXgtd3JhcFxcXCI+PHZsLXBsb3QtZ3JvdXAgbmctcmVwZWF0PVxcXCJjaGFydCBpbiBCb29rbWFya3MuZGljdCB8IG9yZGVyT2JqZWN0QnkgOiBcXCd0aW1lQWRkZWRcXCcgOiBmYWxzZVxcXCIgY2xhc3M9XFxcIndyYXBwZWQtdmwtcGxvdC1ncm91cCBjYXJkXFxcIiBjaGFydD1cXFwiY2hhcnRcXFwiIGZpZWxkLXNldD1cXFwiY2hhcnQuZmllbGRTZXRcXFwiIHNob3ctYm9va21hcms9XFxcInRydWVcXFwiIHNob3ctZGVidWc9XFxcImNvbnN0cy5kZWJ1Z1xcXCIgc2hvdy1leHBhbmQ9XFxcImZhbHNlXFxcIiBhbHdheXMtc2VsZWN0ZWQ9XFxcInRydWVcXFwiIGhpZ2hsaWdodGVkPVxcXCJoaWdobGlnaHRlZFxcXCIgbmctbW91c2VvdmVyPVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZC5uYW1lXSA9IHRydWVcXFwiIG5nLW1vdXNlb3V0PVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZC5uYW1lXSA9IGZhbHNlXFxcIiBvdmVyZmxvdz1cXFwidHJ1ZVxcXCIgdG9vbHRpcD1cXFwidHJ1ZVxcXCIgcHJpb3JpdHk9XFxcImNvbnN0cy5wcmlvcml0eS5ib29rbWFya1xcXCI+PC92bC1wbG90LWdyb3VwPjwvZGl2PjxkaXYgY2xhc3M9XFxcInZpcy1saXN0LWVtcHR5XFxcIiBuZy1pZj1cXFwiQm9va21hcmtzLmxlbmd0aCA9PT0gMFxcXCI+WW91IGhhdmUgbm8gYm9va21hcmtzPC9kaXY+PC9kaXY+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZG15cmlhZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtbXlyaWEtZGF0YXNldFxcXCI+PHA+U2VsZWN0IGEgZGF0YXNldCBmcm9tIHRoZSBNeXJpYSBpbnN0YW5jZSBhdCA8Y29kZT57e215cmlhUmVzdFVybH19PC9jb2RlPi48L3A+PGZvcm0gbmctc3VibWl0PVxcXCJhZGREYXRhc2V0KG15cmlhRGF0YXNldClcXFwiPjxkaXY+PHNlbGVjdCBuYW1lPVxcXCJteXJpYS1kYXRhc2V0XFxcIiBpZD1cXFwic2VsZWN0LW15cmlhLWRhdGFzZXRcXFwiIG5nLWRpc2FibGVkPVxcXCJkaXNhYmxlZFxcXCIgbmctbW9kZWw9XFxcIm15cmlhRGF0YXNldFxcXCIgbmctb3B0aW9ucz1cXFwib3B0aW9uTmFtZShkYXRhc2V0KSBmb3IgZGF0YXNldCBpbiBteXJpYURhdGFzZXRzIHRyYWNrIGJ5IGRhdGFzZXQucmVsYXRpb25OYW1lXFxcIj48b3B0aW9uIHZhbHVlPVxcXCJcXFwiPlNlbGVjdCBEYXRhc2V0Li4uPC9vcHRpb24+PC9zZWxlY3Q+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvYWRkdXJsZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtdXJsLWRhdGFzZXRcXFwiPjxwPkFkZCB0aGUgbmFtZSBvZiB0aGUgZGF0YXNldCBhbmQgdGhlIFVSTCB0byBhIDxiPkpTT048L2I+IG9yIDxiPkNTVjwvYj4gKHdpdGggaGVhZGVyKSBmaWxlLiBNYWtlIHN1cmUgdGhhdCB0aGUgZm9ybWF0dGluZyBpcyBjb3JyZWN0IGFuZCBjbGVhbiB0aGUgZGF0YSBiZWZvcmUgYWRkaW5nIGl0IHRvIFZveWFnZXIuIFRoZSBhZGRlZCBkYXRhc2V0IGlzIG9ubHkgdmlzaWJsZSB0byB5b3UuPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRnJvbVVybChhZGRlZERhdGFzZXQpXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LW5hbWVcXFwiPk5hbWU8L2xhYmVsPiA8aW5wdXQgbmctbW9kZWw9XFxcImFkZGVkRGF0YXNldC5uYW1lXFxcIiBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LXVybFxcXCI+VVJMPC9sYWJlbD4gPGlucHV0IG5nLW1vZGVsPVxcXCJhZGRlZERhdGFzZXQudXJsXFxcIiBpZD1cXFwiZGF0YXNldC11cmxcXFwiIHR5cGU9XFxcInVybFxcXCI+PHA+TWFrZSBzdXJlIHRoYXQgeW91IGhvc3QgdGhlIGZpbGUgb24gYSBzZXJ2ZXIgdGhhdCBoYXMgPGNvZGU+QWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luOiAqPC9jb2RlPiBzZXQuPC9wPjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiY2hhbmdlLWxvYWRlZC1kYXRhc2V0XFxcIj48ZGl2IG5nLWlmPVxcXCJ1c2VyRGF0YS5sZW5ndGhcXFwiPjxoMz5VcGxvYWRlZCBEYXRhc2V0czwvaDM+PHVsPjxsaSBuZy1yZXBlYXQ9XFxcImRhdGFzZXQgaW4gdXNlckRhdGEgdHJhY2sgYnkgZGF0YXNldC5pZFxcXCIgbmctY2xhc3M9XFxcIntzZWxlY3RlZDogRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZH1cXFwiPjxhIGNsYXNzPVxcXCJkYXRhc2V0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0RGF0YXNldChkYXRhc2V0KVxcXCIgbmctZGlzYWJsZWQ9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1kYXRhYmFzZVxcXCI+PC9pPiA8c3Ryb25nPnt7ZGF0YXNldC5uYW1lfX08L3N0cm9uZz48L2E+IDxzcGFuIG5nLWlmPVxcXCJkYXRhc2V0LmRlc2NyaXB0aW9uXFxcIj57e2RhdGFzZXQuZGVzY3JpcHRpb259fTwvc3Bhbj4gPHN0cm9uZyBuZy1pZj1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldCA9PT0gZGF0YXNldFxcXCI+KHNlbGVjdGVkKTwvc3Ryb25nPjwvbGk+PC91bD48L2Rpdj48aDM+RXhwbG9yZSBhIFNhbXBsZSBEYXRhc2V0PC9oMz48dWwgY2xhc3M9XFxcImxvYWRlZC1kYXRhc2V0LWxpc3RcXFwiPjxsaSBuZy1yZXBlYXQ9XFxcImRhdGFzZXQgaW4gc2FtcGxlRGF0YSB0cmFjayBieSBkYXRhc2V0LmlkXFxcIiBuZy1jbGFzcz1cXFwie3NlbGVjdGVkOiBEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkfVxcXCI+PGEgY2xhc3M9XFxcImRhdGFzZXRcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3REYXRhc2V0KGRhdGFzZXQpXFxcIiBuZy1kaXNhYmxlZD1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWRhdGFiYXNlXFxcIj48L2k+IDxzdHJvbmc+e3tkYXRhc2V0Lm5hbWV9fTwvc3Ryb25nPjwvYT4gPHN0cm9uZyBuZy1pZj1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldCA9PT0gZGF0YXNldFxcXCI+KHNlbGVjdGVkKTwvc3Ryb25nPiA8ZW0gbmctaWY9XFxcImRhdGFzZXQuZGVzY3JpcHRpb25cXFwiPnt7ZGF0YXNldC5kZXNjcmlwdGlvbn19PC9lbT48L2xpPjwvdWw+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9kYXRhc2V0bW9kYWwuaHRtbFwiLFwiPG1vZGFsIGlkPVxcXCJkYXRhc2V0LW1vZGFsXFxcIiBtYXgtd2lkdGg9XFxcIjgwMHB4XFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1oZWFkZXJcXFwiPjxtb2RhbC1jbG9zZS1idXR0b24+PC9tb2RhbC1jbG9zZS1idXR0b24+PGgyPkFkZCBEYXRhc2V0PC9oMj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJtb2RhbC1tYWluXFxcIj48dGFic2V0Pjx0YWIgaGVhZGluZz1cXFwiQ2hhbmdlIERhdGFzZXRcXFwiPjxjaGFuZ2UtbG9hZGVkLWRhdGFzZXQ+PC9jaGFuZ2UtbG9hZGVkLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJQYXN0ZSBvciBVcGxvYWQgRGF0YVxcXCI+PHBhc3RlLWRhdGFzZXQ+PC9wYXN0ZS1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiRnJvbSBVUkxcXFwiPjxhZGQtdXJsLWRhdGFzZXQ+PC9hZGQtdXJsLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJGcm9tIE15cmlhXFxcIj48YWRkLW15cmlhLWRhdGFzZXQ+PC9hZGQtbXlyaWEtZGF0YXNldD48L3RhYj48L3RhYnNldD48L2Rpdj48L21vZGFsPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZGF0YXNldHNlbGVjdG9yLmh0bWxcIixcIjxidXR0b24gaWQ9XFxcInNlbGVjdC1kYXRhXFxcIiBjbGFzcz1cXFwic21hbGwtYnV0dG9uIHNlbGVjdC1kYXRhXFxcIiBuZy1jbGljaz1cXFwibG9hZERhdGFzZXQoKTtcXFwiPkNoYW5nZTwvYnV0dG9uPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZmlsZWRyb3B6b25lLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImRyb3B6b25lXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvcGFzdGVkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInBhc3RlLWRhdGFcXFwiPjxmaWxlLWRyb3B6b25lIGRhdGFzZXQ9XFxcImRhdGFzZXRcXFwiIG1heC1maWxlLXNpemU9XFxcIjEwXFxcIiB2YWxpZC1taW1lLXR5cGVzPVxcXCJbdGV4dC9jc3YsIHRleHQvanNvbiwgdGV4dC90c3ZdXFxcIj48ZGl2IGNsYXNzPVxcXCJ1cGxvYWQtZGF0YVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1maWxlXFxcIj5GaWxlPC9sYWJlbD4gPGlucHV0IHR5cGU9XFxcImZpbGVcXFwiIGlkPVxcXCJkYXRhc2V0LWZpbGVcXFwiIGFjY2VwdD1cXFwidGV4dC9jc3YsdGV4dC90c3ZcXFwiPjwvZGl2PjxwPlVwbG9hZCBhIENTViwgb3IgcGFzdGUgZGF0YSBpbiA8YSBocmVmPVxcXCJodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Db21tYS1zZXBhcmF0ZWRfdmFsdWVzXFxcIj5DU1Y8L2E+IGZvcm1hdCBpbnRvIHRoZSBmaWVsZHMuPC9wPjxkaXYgY2xhc3M9XFxcImRyb3B6b25lLXRhcmdldFxcXCI+PHA+RHJvcCBDU1YgZmlsZSBoZXJlPC9wPjwvZGl2PjwvZGl2Pjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldCgpXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LW5hbWVcXFwiPk5hbWU8L2xhYmVsPiA8aW5wdXQgdHlwZT1cXFwibmFtZVxcXCIgbmctbW9kZWw9XFxcImRhdGFzZXQubmFtZVxcXCIgaWQ9XFxcImRhdGFzZXQtbmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PHRleHRhcmVhIG5nLW1vZGVsPVxcXCJkYXRhc2V0LmRhdGFcXFwiIG5nLW1vZGVsLW9wdGlvbnM9XFxcInsgdXBkYXRlT246IFxcJ2RlZmF1bHQgYmx1clxcJywgZGVib3VuY2U6IHsgXFwnZGVmYXVsdFxcJzogMTcsIFxcJ2JsdXJcXCc6IDAgfX1cXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlxcbiAgICAgIDwvdGV4dGFyZWE+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhPC9idXR0b24+PC9mb3JtPjwvZmlsZS1kcm9wem9uZT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJmaWVsZGluZm8vZmllbGRpbmZvLmh0bWxcIixcIjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1pbmZvXFxcIj48c3BhbiBjbGFzcz1cXFwiaGZsZXggZnVsbC13aWR0aFxcXCIgbmctY2xpY2s9XFxcImNsaWNrZWQoJGV2ZW50KVxcXCI+PHNwYW4gY2xhc3M9XFxcInR5cGUtY2FyZXRcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiAhZGlzYWJsZUNvdW50Q2FyZXQgfHwgZmllbGQuYWdncmVnYXRlIT09XFwnY291bnRcXCd9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93blxcXCIgbmctc2hvdz1cXFwic2hvd0NhcmV0XFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJ0eXBlIGZhIHt7aWNvbn19XFxcIiBuZy1zaG93PVxcXCJzaG93VHlwZVxcXCIgdGl0bGU9XFxcInt7dHlwZU5hbWVzW2ZpZWxkLnR5cGVdfX1cXFwiPjwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZC5hZ2dyZWdhdGUhPT1cXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gbmctaWY9XFxcImZ1bmMoZmllbGQpXFxcIiBjbGFzcz1cXFwiZmllbGQtZnVuY1xcXCIgbmctY2xhc3M9XFxcInthbnk6IGZpZWxkLl9hbnl9XFxcIj57eyBmdW5jKGZpZWxkKSB9fTwvc3Bhbj48c3BhbiBjbGFzcz1cXFwiZmllbGQtbmFtZVxcXCIgbmctY2xhc3M9XFxcIntoYXNmdW5jOiBmdW5jKGZpZWxkKSwgYW55OiBmaWVsZC5fYW55fVxcXCI+e3sgZmllbGQubmFtZSB8IHVuZGVyc2NvcmUyc3BhY2UgfX08L3NwYW4+PC9zcGFuPiA8c3BhbiBuZy1pZj1cXFwiZmllbGQuYWdncmVnYXRlPT09XFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmaWVsZC1jb3VudCBmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIj5DT1VOVDwvc3Bhbj48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgcmVtb3ZlXFxcIiBuZy1zaG93PVxcXCJzaG93UmVtb3ZlXFxcIj48YSBjbGFzcz1cXFwicmVtb3ZlLWZpZWxkXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlQWN0aW9uKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvYT48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgaW5mb1xcXCIgbmctc2hvdz1cXFwic2hvd0luZm9cXFwiPjxpIG5nLWlmPVxcXCJmaWVsZC5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnICYmIGlzVHlwZXMoZmllbGQsIFtcXCdOXFwnLCBcXCdPXFwnXSlcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkLm5hbWV9fTxicj4gPHN0cm9uZz5DYXJkaW5hbGl0eTo8L3N0cm9uZz4ge3tzdGF0cy5kaXN0aW5jdCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1pbjo8L3N0cm9uZz4ge3tzdGF0cy5taW59fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4fX08YnI+IDxzdHJvbmc+U2FtcGxlOjwvc3Ryb25nPiA8c3BhbiBjbGFzcz1cXCdzYW1wbGVcXCc+e3tzdGF0cy5zYW1wbGUuam9pbihcXCcsIFxcJyl9fTwvc3Bhbj4gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+IDxpIG5nLWlmPVxcXCJmaWVsZC5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnICYmIGZpZWxkLnR5cGUgPT09IFxcJ1RcXCdcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkLm5hbWV9fTxicj4gPHN0cm9uZz5DYXJkaW5hbGl0eTo8L3N0cm9uZz4ge3tzdGF0cy5kaXN0aW5jdCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1pbjo8L3N0cm9uZz4ge3tzdGF0cy5taW4gfCBkYXRlOiBzaG9ydH19PGJyPiA8c3Ryb25nPk1heDo8L3N0cm9uZz4ge3tzdGF0cy5tYXggfCBkYXRlOiBzaG9ydH19PGJyPiA8c3Ryb25nPlNhbXBsZTo8L3N0cm9uZz4gPHNwYW4gY2xhc3M9XFwnc2FtcGxlXFwnPnt7c3RhdHMuc2FtcGxlLmpvaW4oXFwnLCBcXCcpfX08L3NwYW4+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPiA8aSBuZy1pZj1cXFwiZmllbGQuYWdncmVnYXRlICE9PSBcXCdjb3VudFxcJyAmJiBmaWVsZC50eXBlID09PSBcXCdRXFwnXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+TmFtZTo8L3N0cm9uZz4ge3tmaWVsZC5uYW1lfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWluIHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWF4Ojwvc3Ryb25nPiB7e3N0YXRzLm1heCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPlN0ZGV2Ojwvc3Ryb25nPiB7e3N0YXRzLnN0ZGV2IHwgbnVtYmVyOjJ9fTxicj4gPHN0cm9uZz5NZWFuOjwvc3Ryb25nPiB7e3N0YXRzLm1lYW4gfCBudW1iZXI6Mn19PGJyPiA8c3Ryb25nPk1lZGlhbjo8L3N0cm9uZz4ge3tzdGF0cy5tZWRpYW4gfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5TYW1wbGU6PC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcJ3NhbXBsZVxcJz57e3N0YXRzLnNhbXBsZS5qb2luKFxcJywgXFwnKX19PC9zcGFuPiA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT48aSBuZy1pZj1cXFwiZmllbGQuYWdncmVnYXRlID09PSBcXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPkNvdW50Ojwvc3Ryb25nPiB7e3N0YXRzLm1heH19IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPjwvc3Bhbj48L3NwYW4+PC9zcGFuPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcIm1vZGFsL21vZGFsLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcIm1vZGFsXFxcIiBuZy1pZj1cXFwiaXNPcGVuXFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC13cmFwcGVyXFxcIiBzdHlsZT1cXFwie3t3cmFwcGVyU3R5bGV9fVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJtb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInJpZ2h0XFxcIj48YSBuZy1jbGljaz1cXFwiY2xvc2VNb2RhbCgpXFxcIiBjbGFzcz1cXFwicmlnaHRcXFwiPkNsb3NlPC9hPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRhYnMvdGFiLmh0bWxcIixcIjxkaXYgbmctaWY9XFxcImFjdGl2ZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ0YWJzL3RhYnNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ0YWItY29udGFpbmVyXFxcIj48ZGl2PjxhIGNsYXNzPVxcXCJ0YWJcXFwiIG5nLXJlcGVhdD1cXFwidGFiIGluIHRhYnNldC50YWJzXFxcIiBuZy1jbGFzcz1cXFwie1xcJ2FjdGl2ZVxcJzogdGFiLmFjdGl2ZX1cXFwiIG5nLWNsaWNrPVxcXCJ0YWJzZXQuc2hvd1RhYih0YWIpXFxcIj57e3RhYi5oZWFkaW5nfX08L2E+PC9kaXY+PGRpdiBjbGFzcz1cXFwidGFiLWNvbnRlbnRzXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInZscGxvdC92bHBsb3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdFxcXCIgaWQ9XFxcInZpcy17e3Zpc0lkfX1cXFwiIG5nLWNsYXNzPVxcXCJ7IGZpdDogIWFsd2F5c1Njcm9sbGFibGUgJiYgIW92ZXJmbG93ICYmIChtYXhIZWlnaHQgJiYgKCFoZWlnaHQgfHwgaGVpZ2h0IDw9IG1heEhlaWdodCkpICYmIChtYXhXaWR0aCAmJiAoIXdpZHRoIHx8IHdpZHRoIDw9IG1heFdpZHRoKSksIG92ZXJmbG93OiBhbHdheXNTY3JvbGxhYmxlIHx8IG92ZXJmbG93IHx8IChtYXhIZWlnaHQgJiYgaGVpZ2h0ICYmIGhlaWdodCA+IG1heEhlaWdodCkgfHwgKG1heFdpZHRoICYmIHdpZHRoICYmIHdpZHRoID4gbWF4V2lkdGgpLCBzY3JvbGw6IGFsd2F5c1Njcm9sbGFibGUgfHwgdW5sb2NrZWQgfHwgaG92ZXJGb2N1cyB9XFxcIiBuZy1tb3VzZWRvd249XFxcInVubG9ja2VkPSF0aHVtYm5haWxcXFwiIG5nLW1vdXNldXA9XFxcInVubG9ja2VkPWZhbHNlXFxcIiBuZy1tb3VzZW92ZXI9XFxcIm1vdXNlb3ZlcigpXFxcIiBuZy1tb3VzZW91dD1cXFwibW91c2VvdXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwidmlzLXRvb2x0aXBcXFwiIG5nLXNob3c9XFxcInRvb2x0aXBBY3RpdmVcXFwiPjx0YWJsZT48dHIgbmctcmVwZWF0PVxcXCJwIGluIGRhdGFcXFwiPjx0ZCBjbGFzcz1cXFwia2V5XFxcIj57e3BbMF19fTwvdGQ+PHRkIGNsYXNzPVxcXCJ2YWx1ZVxcXCI+PGI+e3twWzFdfX08L2I+PC90ZD48L3RyPjwvdGFibGU+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cCB2ZmxleFxcXCI+PGRpdiBuZy1zaG93PVxcXCJzaG93RXhwYW5kIHx8IGZpZWxkU2V0IHx8IHNob3dUcmFuc3Bvc2UgfHwgc2hvd0Jvb2ttYXJrICYmIEJvb2ttYXJrcy5pc1N1cHBvcnRlZCB8fCBzaG93VG9nZ2xlXFxcIiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cC1oZWFkZXIgbm8tc2hyaW5rXFxcIj48ZGl2IGNsYXNzPVxcXCJmaWVsZC1zZXQtaW5mb1xcXCI+PGZpZWxkLWluZm8gbmctcmVwZWF0PVxcXCJmaWVsZCBpbiBmaWVsZFNldFxcXCIgbmctaWY9XFxcImZpZWxkU2V0XFxcIiBmaWVsZD1cXFwiZmllbGRcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgbmctY2xhc3M9XFxcInsgc2VsZWN0ZWQ6IGFsd2F5c1NlbGVjdGVkIHx8IChpc1NlbGVjdGVkICYmIGlzU2VsZWN0ZWQoZmllbGQubmFtZSkpLCB1bnNlbGVjdGVkOiBpc1NlbGVjdGVkICYmICFpc1NlbGVjdGVkKGZpZWxkLm5hbWUpLCBoaWdobGlnaHRlZDogKGhpZ2hsaWdodGVkfHx7fSlbZmllbGQubmFtZV0gfVxcXCIgbmctbW91c2VvdmVyPVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZC5uYW1lXSA9IHRydWVcXFwiIG5nLW1vdXNlb3V0PVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZC5uYW1lXSA9IGZhbHNlXFxcIj48L2ZpZWxkLWluZm8+PC9kaXY+PGRpdiBjbGFzcz1cXFwidG9vbGJveFxcXCI+PGEgbmctaWY9XFxcImNvbnN0cy5kZWJ1ZyAmJiBzaG93RGVidWdcXFwiIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtd3JlbmNoXFxcIiBuZy1jbGljaz1cXFwic2hDb3BpZWQ9XFwnXFwnOyB2bENvcGllZD1cXCdcXCc7IHZnQ29waWVkPVxcJ1xcJztcXFwiIG5nLW1vdXNlb3Zlcj1cXFwiaW5pdGlhbGl6ZVBvcHVwKCk7XFxcIj48L2k+PC9hPjx2bC1wbG90LWdyb3VwLXBvcHVwIG5nLWlmPVxcXCJjb25zdHMuZGVidWcgJiYgc2hvd0RlYnVnICYmIHJlbmRlclBvcHVwXFxcIj48L3ZsLXBsb3QtZ3JvdXAtcG9wdXA+PGEgbmctaWY9XFxcInNob3dNYXJrVHlwZVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGlzYWJsZWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1mb250XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1saW5lLWNoYXJ0XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1hcmVhLWNoYXJ0XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1iYXItY2hhcnRcXFwiPjwvaT4gPGkgY2xhc3M9XFxcImZhIGZhLWNpcmNsZS1vXFxcIj48L2k+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0xvZyAmJiBjaGFydC52bFNwZWMgJiYgbG9nLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBcXCd4XFwnKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneFxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy1yaWdodFxcXCI+PC9pPiA8c21hbGw+TG9nIFg8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwibG9nLnRvZ2dsZShjaGFydC52bFNwZWMsIFxcJ3lcXCcpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogbG9nLmFjdGl2ZShjaGFydC52bFNwZWMsIFxcJ3lcXCcpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvbmctYXJyb3ctdXBcXFwiPjwvaT4gPHNtYWxsPkxvZyBZPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93U29ydCAmJiBjaGFydC52bFNwZWMgJiYgdG9nZ2xlU29ydC5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgRGF0YXNldC5zdGF0cylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlU29ydC50b2dnbGUoY2hhcnQudmxTcGVjKVxcXCI+PGkgY2xhc3M9XFxcImZhIHNvcnRcXFwiIG5nLWNsYXNzPVxcXCJ0b2dnbGVTb3J0Q2xhc3MoY2hhcnQudmxTcGVjKVxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+U29ydDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0ZpbHRlck51bGwgJiYgY2hhcnQudmxTcGVjICYmIHRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydChjaGFydC52bFNwZWMsIERhdGFzZXQuc3RhdHMpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRvZ2dsZUZpbHRlck51bGwoY2hhcnQudmxTcGVjKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGNoYXJ0LnZsU3BlYyAmJiBjaGFydC52bFNwZWMuY2ZnLmZpbHRlck51bGwuT31cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1maWx0ZXJcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPkZpbHRlcjwvc21hbGw+IDxzbWFsbD5OVUxMPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93VHJhbnNwb3NlXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRyYW5zcG9zZSgpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcmVmcmVzaCB0cmFuc3Bvc2VcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPlN3YXAgWC9ZPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcIkJvb2ttYXJrcy50b2dnbGUoY2hhcnQpXFxcIiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiAhY2hhcnQudmxTcGVjLmVuY29kaW5nLCBhY3RpdmU6IEJvb2ttYXJrcy5pc0Jvb2ttYXJrZWQoY2hhcnQuc2hvcnRoYW5kKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib29rbWFya1xcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+Qm9va21hcms8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dFeHBhbmRcXFwiIG5nLWNsaWNrPVxcXCJleHBhbmRBY3Rpb24oKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2E+PC9kaXY+PC9kaXY+PHZsLXBsb3QgY2xhc3M9XFxcImZsZXgtZ3Jvdy0xXFxcIiBkYXRhLWZpZWxkc2V0PVxcXCJ7ZmllbGRTZXQua2V5fX1cXFwiIGNoYXJ0PVxcXCJjaGFydFxcXCIgZGlzYWJsZWQ9XFxcImRpc2FibGVkXFxcIiBpcy1pbi1saXN0PVxcXCJpc0luTGlzdFxcXCIgYWx3YXlzLXNjcm9sbGFibGU9XFxcImFsd2F5c1Njcm9sbGFibGVcXFwiIGNvbmZpZy1zZXQ9XFxcInt7Y29uZmlnU2V0fHxcXCdzbWFsbFxcJ319XFxcIiBtYXgtaGVpZ2h0PVxcXCJtYXhIZWlnaHRcXFwiIG1heC13aWR0aD1cXFwibWF4V2lkdGhcXFwiIG92ZXJmbG93PVxcXCJvdmVyZmxvd1xcXCIgcHJpb3JpdHk9XFxcInByaW9yaXR5XFxcIiByZXNjYWxlPVxcXCJyZXNjYWxlXFxcIiB0aHVtYm5haWw9XFxcInRodW1ibmFpbFxcXCIgdG9vbHRpcD1cXFwidG9vbHRpcFxcXCI+PC92bC1wbG90PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInZscGxvdGdyb3VwL3ZscGxvdGdyb3VwcG9wdXAuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiZHJvcC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInBvcHVwLW1lbnUgcG9wdXAtY29tbWFuZCBuby1zaHJpbmsgZGV2LXRvb2xcXFwiPjxkaXYgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxzcGFuIGNsYXNzPVxcXCJkZWJ1Z1xcXCI+VmxzPC9zcGFuPiA8YSBjbGFzcz1cXFwiZGVidWdcXFwiIHVpLXplcm9jbGlwPVxcXCJcXFwiIHplcm9jbGlwLWNvcGllZD1cXFwic2hDb3BpZWQ9XFwnKENvcGllZClcXCdcXFwiIHplcm9jbGlwLW1vZGVsPVxcXCJjaGFydC5zaG9ydGhhbmRcXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWTCBzaG9ydGhhbmRcXCcsIGNoYXJ0LnNob3J0aGFuZCk7IHNoQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3NoQ29waWVkfX08L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WbDwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZsQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQuY2xlYW5TcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhLWxpdGVcXCcsIGNoYXJ0LmNsZWFuU3BlYyk7IHZsQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZsQ29waWVkfX08L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WZzwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZnQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQudmdTcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhXFwnLCBjaGFydC52Z1NwZWMpOyB2Z0NvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3t2Z0NvcGllZH19PC9zcGFuPjwvZGl2PjxhIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIiBuZy1ocmVmPVxcXCJ7eyB7dHlwZTpcXCd2bFxcJywgZW5jb2Rpbmc6IGNoYXJ0LmNsZWFuU3BlY30gfCByZXBvcnRVcmwgfX1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5SZXBvcnQgQmFkIFJlbmRlcjwvYT4gPGEgbmctY2xpY2s9XFxcInNob3dGZWF0dXJlPSFzaG93RmVhdHVyZVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPnt7Y2hhcnQuc2NvcmV9fTwvYT48ZGl2IG5nLXJlcGVhdD1cXFwiZiBpbiBjaGFydC5zY29yZUZlYXR1cmVzIHRyYWNrIGJ5IGYucmVhc29uXFxcIj5be3tmLnNjb3JlfX1dIHt7Zi5yZWFzb259fTwvZGl2PjwvZGl2PjwvZGl2PlwiKTt9XSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FsZXJ0TWVzc2FnZXMnLCBmdW5jdGlvbihBbGVydHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdhbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuQWxlcnRzID0gQWxlcnRzO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdBbGVydHMnLCBmdW5jdGlvbigkdGltZW91dCwgXykge1xuICAgIHZhciBBbGVydHMgPSB7fTtcblxuICAgIEFsZXJ0cy5hbGVydHMgPSBbXTtcblxuICAgIEFsZXJ0cy5hZGQgPSBmdW5jdGlvbihtc2csIGRpc21pc3MpIHtcbiAgICAgIHZhciBtZXNzYWdlID0ge21zZzogbXNnfTtcbiAgICAgIEFsZXJ0cy5hbGVydHMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmIChkaXNtaXNzKSB7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBpbmRleCA9IF8uZmluZEluZGV4KEFsZXJ0cy5hbGVydHMsIG1lc3NhZ2UpO1xuICAgICAgICAgIEFsZXJ0cy5jbG9zZUFsZXJ0KGluZGV4KTtcbiAgICAgICAgfSwgZGlzbWlzcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIEFsZXJ0cy5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIEFsZXJ0cy5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFsZXJ0cztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Ym9va21hcmtMaXN0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYm9va21hcmtMaXN0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYm9va21hcmtMaXN0JywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoaWdobGlnaHRlZDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgLy8gVGhlIGJvb2ttYXJrIGxpc3QgaXMgZGVzaWduZWQgdG8gcmVuZGVyIHdpdGhpbiBhIG1vZGFsIG92ZXJsYXkuXG4gICAgICAgIC8vIEJlY2F1c2UgbW9kYWwgY29udGVudHMgYXJlIGhpZGRlbiB2aWEgbmctaWYsIGlmIHRoaXMgbGluayBmdW5jdGlvbiBpc1xuICAgICAgICAvLyBleGVjdXRpbmcgaXQgaXMgYmVjYXVzZSB0aGUgZGlyZWN0aXZlIGlzIGJlaW5nIHNob3duLiBMb2cgdGhlIGV2ZW50OlxuICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfT1BFTik7XG4gICAgICAgIHNjb3BlLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19DTE9TRSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuQm9va21hcmtzID0gQm9va21hcmtzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuQm9va21hcmtzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgQm9va21hcmtzXG4gKiBTZXJ2aWNlIGluIHRoZSB2bHVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdCb29rbWFya3MnLCBmdW5jdGlvbihfLCB2bCwgbG9jYWxTdG9yYWdlU2VydmljZSwgTG9nZ2VyLCBEYXRhc2V0KSB7XG4gICAgdmFyIEJvb2ttYXJrcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgICB0aGlzLmlzU3VwcG9ydGVkID0gbG9jYWxTdG9yYWdlU2VydmljZS5pc1N1cHBvcnRlZDtcbiAgICB9O1xuXG4gICAgdmFyIHByb3RvID0gQm9va21hcmtzLnByb3RvdHlwZTtcblxuICAgIHByb3RvLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5sZW5ndGggPSBPYmplY3Qua2V5cyh0aGlzLmRpY3QpLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgcHJvdG8uc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgbG9jYWxTdG9yYWdlU2VydmljZS5zZXQoJ2Jvb2ttYXJrcycsIHRoaXMuZGljdCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZGljdCA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KCdib29rbWFya3MnKSB8fCB7fTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgfTtcblxuICAgIHByb3RvLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMRUFSKTtcbiAgICB9O1xuXG4gICAgcHJvdG8udG9nZ2xlID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgIHZhciBzaG9ydGhhbmQgPSBjaGFydC5zaG9ydGhhbmQ7XG5cbiAgICAgIGlmICh0aGlzLmRpY3Rbc2hvcnRoYW5kXSkge1xuICAgICAgICB0aGlzLnJlbW92ZShjaGFydCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFkZChjaGFydCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHByb3RvLmFkZCA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICBjb25zb2xlLmxvZygnYWRkaW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBjaGFydC50aW1lQWRkZWQgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXG4gICAgICBjaGFydC5zdGF0cyA9IERhdGFzZXQuc3RhdHM7XG5cbiAgICAgIHRoaXMuZGljdFtzaG9ydGhhbmRdID0gXy5jbG9uZURlZXAoY2hhcnQpO1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQURELCBzaG9ydGhhbmQpO1xuICAgIH07XG5cbiAgICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgY29uc29sZS5sb2coJ3JlbW92aW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBkZWxldGUgdGhpcy5kaWN0W3Nob3J0aGFuZF07XG4gICAgICB0aGlzLnVwZGF0ZUxlbmd0aCgpO1xuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19SRU1PVkUsIHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLmlzQm9va21hcmtlZCA9IGZ1bmN0aW9uKHNob3J0aGFuZCkge1xuICAgICAgcmV0dXJuIHNob3J0aGFuZCBpbiB0aGlzLmRpY3Q7XG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgQm9va21hcmtzKCk7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZE15cmlhRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGFkZE15cmlhRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZE15cmlhRGF0YXNldCcsIGZ1bmN0aW9uICgkaHR0cCwgRGF0YXNldCwgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2NvcGUgdmFyaWFibGVzXG4gICAgICAgIHNjb3BlLm15cmlhUmVzdFVybCA9IGNvbnN0cy5teXJpYVJlc3Q7XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldHMgPSBbXTtcbiAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0ID0gbnVsbDtcblxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMgPSBmdW5jdGlvbihxdWVyeSkge1xuICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoc2NvcGUubXlyaWFSZXN0VXJsICsgJy9kYXRhc2V0L3NlYXJjaC8/cT0nICsgcXVlcnkpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIExvYWQgdGhlIGF2YWlsYWJsZSBkYXRhc2V0cyBmcm9tIE15cmlhXG4gICAgICAgIHNjb3BlLmxvYWREYXRhc2V0cygnJyk7XG5cbiAgICAgICAgc2NvcGUub3B0aW9uTmFtZSA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXNldC51c2VyTmFtZSArICc6JyArIGRhdGFzZXQucHJvZ3JhbU5hbWUgKyAnOicgKyBkYXRhc2V0LnJlbGF0aW9uTmFtZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGREYXRhc2V0ID0gZnVuY3Rpb24obXlyaWFEYXRhc2V0KSB7XG4gICAgICAgICAgdmFyIGRhdGFzZXQgPSB7XG4gICAgICAgICAgICBncm91cDogJ215cmlhJyxcbiAgICAgICAgICAgIG5hbWU6IG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUsXG4gICAgICAgICAgICB1cmw6IHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC91c2VyLScgKyBteXJpYURhdGFzZXQudXNlck5hbWUgK1xuICAgICAgICAgICAgICAnL3Byb2dyYW0tJyArIG15cmlhRGF0YXNldC5wcm9ncmFtTmFtZSArXG4gICAgICAgICAgICAgICcvcmVsYXRpb24tJyArIG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUgKyAnL2RhdGE/Zm9ybWF0PWpzb24nXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdqc29uJztcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChkYXRhc2V0KTtcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZFVybERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRVcmxEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWRkVXJsRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRoZSBkYXRhc2V0IHRvIGFkZFxuICAgICAgICBzY29wZS5hZGRlZERhdGFzZXQgPSB7XG4gICAgICAgICAgZ3JvdXA6ICd1c2VyJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZEZyb21VcmwgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfTkVXX1VSTCwgZGF0YXNldC51cmwpO1xuXG4gICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIG5ldyBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBGZXRjaCAmIGFjdGl2YXRlIHRoZSBuZXdseS1yZWdpc3RlcmVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6aW5Hcm91cFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgaW5Hcm91cFxuICogR2V0IGRhdGFzZXRzIGluIGEgcGFydGljdWxhciBncm91cFxuICogQHBhcmFtICB7U3RyaW5nfSBkYXRhc2V0R3JvdXAgT25lIG9mIFwic2FtcGxlLFwiIFwidXNlclwiLCBvciBcIm15cmlhXCJcbiAqIEByZXR1cm4ge0FycmF5fSBBbiBhcnJheSBvZiBkYXRhc2V0cyBpbiB0aGUgc3BlY2lmaWVkIGdyb3VwXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignaW5Hcm91cCcsIGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYXJyLCBkYXRhc2V0R3JvdXApIHtcbiAgICAgIHJldHVybiBfLndoZXJlKGFyciwge1xuICAgICAgICBncm91cDogZGF0YXNldEdyb3VwXG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpjaGFuZ2VMb2FkZWREYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgY2hhbmdlTG9hZGVkRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2NoYW5nZUxvYWRlZERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhwb3NlIGRhdGFzZXQgb2JqZWN0IGl0c2VsZiBzbyBjdXJyZW50IGRhdGFzZXQgY2FuIGJlIG1hcmtlZFxuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcblxuICAgICAgICBzY29wZS51c2VyRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNhbXBsZURhdGEgPSBfLndoZXJlKERhdGFzZXQuZGF0YXNldHMsIHtcbiAgICAgICAgICBncm91cDogJ3NhbXBsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBEYXRhc2V0LmRhdGFzZXRzLmxlbmd0aDtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdERhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShkYXRhc2V0KTtcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGdldE5hbWVNYXAoZGF0YXNjaGVtYSkge1xuICByZXR1cm4gZGF0YXNjaGVtYS5yZWR1Y2UoZnVuY3Rpb24obSwgZmllbGQpIHtcbiAgICBtW2ZpZWxkLm5hbWVdID0gZmllbGQ7XG4gICAgcmV0dXJuIG07XG4gIH0sIHt9KTtcbn1cblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnRGF0YXNldCcsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQWxlcnRzLCBfLCBkbCwgdmwsIFNhbXBsZURhdGEsIENvbmZpZywgTG9nZ2VyKSB7XG4gICAgdmFyIERhdGFzZXQgPSB7fTtcblxuICAgIC8vIFN0YXJ0IHdpdGggdGhlIGxpc3Qgb2Ygc2FtcGxlIGRhdGFzZXRzXG4gICAgdmFyIGRhdGFzZXRzID0gU2FtcGxlRGF0YTtcblxuICAgIERhdGFzZXQuZGF0YXNldHMgPSBkYXRhc2V0cztcbiAgICBEYXRhc2V0LmRhdGFzZXQgPSBkYXRhc2V0c1sxXTtcbiAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gdW5kZWZpbmVkOyAgLy8gZGF0YXNldCBiZWZvcmUgdXBkYXRlXG4gICAgRGF0YXNldC5kYXRhc2NoZW1hID0gW107XG4gICAgRGF0YXNldC5kYXRhc2NoZW1hLmJ5TmFtZSA9IHt9O1xuICAgIERhdGFzZXQuc3RhdHMgPSB7fTtcbiAgICBEYXRhc2V0LnR5cGUgPSB1bmRlZmluZWQ7XG5cbiAgICB2YXIgdHlwZU9yZGVyID0ge1xuICAgICAgTjogMCxcbiAgICAgIE86IDAsXG4gICAgICBHOiAyLFxuICAgICAgVDogMyxcbiAgICAgIFE6IDRcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkgPSB7fTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGUgPSBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgaWYgKGZpZWxkLmFnZ3JlZ2F0ZT09PSdjb3VudCcpIHJldHVybiA0O1xuICAgICAgcmV0dXJuIHR5cGVPcmRlcltmaWVsZC50eXBlXTtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIHJldHVybiBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlKGZpZWxkKSArICdfJyArXG4gICAgICAgIChmaWVsZC5hZ2dyZWdhdGUgPT09ICdjb3VudCcgPyAnficgOiBmaWVsZC5uYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAvLyB+IGlzIHRoZSBsYXN0IGNoYXJhY3RlciBpbiBBU0NJSVxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5vcmlnaW5hbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIDA7IC8vIG5vIHN3YXAgd2lsbCBvY2N1clxuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5uYW1lID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIHJldHVybiBmaWVsZC5uYW1lO1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS5jYXJkaW5hbGl0eSA9IGZ1bmN0aW9uKGZpZWxkLCBzdGF0cykge1xuICAgICAgcmV0dXJuIHN0YXRzW2ZpZWxkLm5hbWVdLmRpc3RpbmN0O1xuICAgIH07XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXIgPSBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlVGhlbk5hbWU7XG5cbiAgICBEYXRhc2V0LmdldFNjaGVtYSA9IGZ1bmN0aW9uKGRhdGEsIHN0YXRzLCBvcmRlcikge1xuICAgICAgdmFyIHR5cGVzID0gZGwudHlwZS5pbmZlckFsbChkYXRhKSxcbiAgICAgICAgc2NoZW1hID0gXy5yZWR1Y2UodHlwZXMsIGZ1bmN0aW9uKHMsIHR5cGUsIG5hbWUpIHtcbiAgICAgICAgICB2YXIgZmllbGQgPSB7XG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgdHlwZTogdmwuZGF0YS50eXBlc1t0eXBlXSxcbiAgICAgICAgICAgIHByaW1pdGl2ZVR5cGU6IHR5cGVcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKGZpZWxkLnR5cGUgPT09ICdRJyAmJiBzdGF0c1tmaWVsZC5uYW1lXS5kaXN0aW5jdCA8PSA1KSB7XG4gICAgICAgICAgICBmaWVsZC50eXBlID0gJ08nO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHMucHVzaChmaWVsZCk7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH0sIFtdKTtcblxuICAgICAgc2NoZW1hID0gZGwuc3RhYmxlc29ydChzY2hlbWEsIG9yZGVyIHx8IERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSwgRGF0YXNldC5maWVsZE9yZGVyQnkubmFtZSk7XG5cbiAgICAgIHNjaGVtYS5wdXNoKHZsLmVuY0RlZi5jb3VudCgpKTtcbiAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfTtcblxuICAgIC8vIHVwZGF0ZSB0aGUgc2NoZW1hIGFuZCBzdGF0c1xuICAgIERhdGFzZXQub25VcGRhdGUgPSBbXTtcblxuICAgIERhdGFzZXQudXBkYXRlID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgdmFyIHVwZGF0ZVByb21pc2U7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX0NIQU5HRSwgZGF0YXNldC5uYW1lKTtcblxuICAgICAgaWYgKGRhdGFzZXQudmFsdWVzKSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSAkcShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAvLyBqc2hpbnQgdW51c2VkOmZhbHNlXG4gICAgICAgICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YXNldC52YWx1ZXMpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gJGh0dHAuZ2V0KGRhdGFzZXQudXJsLCB7Y2FjaGU6IHRydWV9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgdmFyIGRhdGE7XG5cbiAgICAgICAgICAvLyBmaXJzdCBzZWUgd2hldGhlciB0aGUgZGF0YSBpcyBKU09OLCBvdGhlcndpc2UgdHJ5IHRvIHBhcnNlIENTVlxuICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2pzb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZGwucmVhZChyZXNwb25zZS5kYXRhLCB7dHlwZTogJ2Nzdid9KTtcbiAgICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdjc3YnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBEYXRhc2V0Lm9uVXBkYXRlLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9IHVwZGF0ZVByb21pc2UudGhlbihsaXN0ZW5lcik7XG4gICAgICB9KTtcblxuICAgICAgLy8gQ29weSB0aGUgZGF0YXNldCBpbnRvIHRoZSBjb25maWcgc2VydmljZSBvbmNlIGl0IGlzIHJlYWR5XG4gICAgICB1cGRhdGVQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIENvbmZpZy51cGRhdGVEYXRhc2V0KGRhdGFzZXQsIERhdGFzZXQudHlwZSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHVwZGF0ZVByb21pc2U7XG4gICAgfTtcblxuICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEgPSBmdW5jdGlvbihkYXRhc2V0LCBkYXRhKSB7XG4gICAgICBEYXRhc2V0LmRhdGEgPSBkYXRhO1xuXG4gICAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gZGF0YXNldDtcbiAgICAgIERhdGFzZXQuc3RhdHMgPSB2bC5kYXRhLnN0YXRzKERhdGFzZXQuZGF0YSk7XG5cbiAgICAgIGZvciAodmFyIGZpZWxkTmFtZSBpbiBEYXRhc2V0LnN0YXRzKSB7XG4gICAgICAgIGlmIChmaWVsZE5hbWUgIT09ICcqJykge1xuICAgICAgICAgIERhdGFzZXQuc3RhdHNbZmllbGROYW1lXS5zYW1wbGUgPSBfLnNhbXBsZShfLnBsdWNrKERhdGFzZXQuZGF0YSwgZmllbGROYW1lKSwgNyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgRGF0YXNldC5kYXRhc2NoZW1hID0gRGF0YXNldC5nZXRTY2hlbWEoRGF0YXNldC5kYXRhLCBEYXRhc2V0LnN0YXRzKTtcbiAgICAgIERhdGFzZXQuZGF0YXNjaGVtYS5ieU5hbWUgPSBnZXROYW1lTWFwKERhdGFzZXQuZGF0YXNjaGVtYSk7XG4gICAgfTtcblxuICAgIERhdGFzZXQuYWRkID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgaWYgKCFkYXRhc2V0LmlkKSB7XG4gICAgICAgIGRhdGFzZXQuaWQgPSBkYXRhc2V0LnVybDtcbiAgICAgIH1cbiAgICAgIGRhdGFzZXRzLnB1c2goZGF0YXNldCk7XG5cbiAgICAgIHJldHVybiBkYXRhc2V0O1xuICAgIH07XG5cbiAgICByZXR1cm4gRGF0YXNldDtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZGF0YXNldE1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZGF0YXNldE1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldE1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiBmYWxzZVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2RhdGFzZXRTZWxlY3RvcicsIGZ1bmN0aW9uKE1vZGFscywgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7fSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9PUEVOKTtcbiAgICAgICAgICBNb2RhbHMub3BlbignZGF0YXNldC1tb2RhbCcpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpbGVEcm9wem9uZVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpbGVEcm9wem9uZVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC8vIEFkZCB0aGUgZmlsZSByZWFkZXIgYXMgYSBuYW1lZCBkZXBlbmRlbmN5XG4gIC5jb25zdGFudCgnRmlsZVJlYWRlcicsIHdpbmRvdy5GaWxlUmVhZGVyKVxuICAuZGlyZWN0aXZlKCdmaWxlRHJvcHpvbmUnLCBmdW5jdGlvbiAoTW9kYWxzLCBBbGVydHMsIEZpbGVSZWFkZXIpIHtcblxuICAgIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgICBmdW5jdGlvbiBpc1NpemVWYWxpZChzaXplLCBtYXhTaXplKSB7XG4gICAgICAvLyBTaXplIGlzIHByb3ZpZGVkIGluIGJ5dGVzOyBtYXhTaXplIGlzIHByb3ZpZGVkIGluIG1lZ2FieXRlc1xuICAgICAgLy8gQ29lcmNlIG1heFNpemUgdG8gYSBudW1iZXIgaW4gY2FzZSBpdCBjb21lcyBpbiBhcyBhIHN0cmluZyxcbiAgICAgIC8vICYgcmV0dXJuIHRydWUgd2hlbiBtYXggZmlsZSBzaXplIHdhcyBub3Qgc3BlY2lmaWVkLCBpcyBlbXB0eSxcbiAgICAgIC8vIG9yIGlzIHN1ZmZpY2llbnRseSBsYXJnZVxuICAgICAgcmV0dXJuICFtYXhTaXplIHx8ICggc2l6ZSAvIDEwMjQgLyAxMDI0IDwgK21heFNpemUgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1R5cGVWYWxpZCh0eXBlLCB2YWxpZE1pbWVUeXBlcykge1xuICAgICAgICAvLyBJZiBubyBtaW1lIHR5cGUgcmVzdHJpY3Rpb25zIHdlcmUgcHJvdmlkZWQsIG9yIHRoZSBwcm92aWRlZCBmaWxlJ3NcbiAgICAgICAgLy8gdHlwZSBpcyB3aGl0ZWxpc3RlZCwgdHlwZSBpcyB2YWxpZFxuICAgICAgcmV0dXJuICF2YWxpZE1pbWVUeXBlcyB8fCAoIHZhbGlkTWltZVR5cGVzLmluZGV4T2YodHlwZSkgPiAtMSApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZmlsZWRyb3B6b25lLmh0bWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAvLyBQZXJtaXQgYXJiaXRyYXJ5IGNoaWxkIGNvbnRlbnRcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBtYXhGaWxlU2l6ZTogJ0AnLFxuICAgICAgICB2YWxpZE1pbWVUeXBlczogJ0AnLFxuICAgICAgICAvLyBFeHBvc2UgdGhpcyBkaXJlY3RpdmUncyBkYXRhc2V0IHByb3BlcnR5IHRvIHBhcmVudCBzY29wZXMgdGhyb3VnaFxuICAgICAgICAvLyB0d28td2F5IGRhdGFiaW5kaW5nXG4gICAgICAgIGRhdGFzZXQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudC8qLCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmRhdGFzZXQgPSBzY29wZS5kYXRhc2V0IHx8IHt9O1xuXG4gICAgICAgIGVsZW1lbnQub24oJ2RyYWdvdmVyIGRyYWdlbnRlcicsIGZ1bmN0aW9uIG9uRHJhZ0VudGVyKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ2NvcHknO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiByZWFkRmlsZShmaWxlKSB7XG4gICAgICAgICAgaWYgKCFpc1R5cGVWYWxpZChmaWxlLnR5cGUsIHNjb3BlLnZhbGlkTWltZVR5cGVzKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdJbnZhbGlkIGZpbGUgdHlwZS4gRmlsZSBtdXN0IGJlIG9uZSBvZiBmb2xsb3dpbmcgdHlwZXM6ICcgKyBzY29wZS52YWxpZE1pbWVUeXBlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpc1NpemVWYWxpZChmaWxlLnNpemUsIHNjb3BlLm1heEZpbGVTaXplKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdGaWxlIG11c3QgYmUgc21hbGxlciB0aGFuICcgKyBzY29wZS5tYXhGaWxlU2l6ZSArICcgTUInKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBzY29wZS4kYXBwbHkoZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5kYXRhID0gZXZ0LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFN0cmlwIGZpbGUgbmFtZSBleHRlbnNpb25zIGZyb20gdGhlIHVwbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5uYW1lID0gZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlxcdyskLywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBBbGVydHMuYWRkKCdFcnJvciByZWFkaW5nIGZpbGUnKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50Lm9uKCdkcm9wJywgZnVuY3Rpb24gb25Ecm9wKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlYWRGaWxlKGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzWzBdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZWxlbWVudC5maW5kKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiBvblVwbG9hZCgvKmV2ZW50Ki8pIHtcbiAgICAgICAgICAvLyBcInRoaXNcIiBpcyB0aGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgIHJlYWRGaWxlKHRoaXMuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnBhc3RlRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHBhc3RlRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3Bhc3RlRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIsIENvbmZpZywgXywgZGwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY29wZSB2YXJpYWJsZXNcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHtcbiAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICBkYXRhOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IGRsLnJlYWQoc2NvcGUuZGF0YXNldC5kYXRhLCB7XG4gICAgICAgICAgICB0eXBlOiAnY3N2J1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIHBhc3RlZERhdGFzZXQgPSB7XG4gICAgICAgICAgICBpZDogRGF0ZS5ub3coKSwgIC8vIHRpbWUgYXMgaWRcbiAgICAgICAgICAgIG5hbWU6IHNjb3BlLmRhdGFzZXQubmFtZSxcbiAgICAgICAgICAgIHZhbHVlczogZGF0YSxcbiAgICAgICAgICAgIGdyb3VwOiAncGFzdGVkJ1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBMb2cgdGhhdCB3ZSBoYXZlIHBhc3RlZCBkYXRhXG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfTkVXX1BBU1RFLCBwYXN0ZWREYXRhc2V0Lm5hbWUpO1xuXG4gICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIHBhc3RlZCBkYXRhIGFzIGEgbmV3IGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChwYXN0ZWREYXRhc2V0KTtcblxuICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBuZXdseS1yZWdpc3RlcmVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQ2xvc2UgdGhpcyBkaXJlY3RpdmUncyBjb250YWluaW5nIG1vZGFsXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ3ZsdWknKS5jb25zdGFudCgnU2FtcGxlRGF0YScsIFt7XG4gIG5hbWU6ICdCYXJsZXknLFxuICBkZXNjcmlwdGlvbjogJ0JhcmxleSB5aWVsZCBieSB2YXJpZXR5IGFjcm9zcyB0aGUgdXBwZXIgbWlkd2VzdCBpbiAxOTMxIGFuZCAxOTMyJyxcbiAgdXJsOiAnZGF0YS9iYXJsZXkuanNvbicsXG4gIGlkOiAnYmFybGV5JyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NhcnMnLFxuICBkZXNjcmlwdGlvbjogJ0F1dG9tb3RpdmUgc3RhdGlzdGljcyBmb3IgYSB2YXJpZXR5IG9mIGNhciBtb2RlbHMgYmV0d2VlbiAxOTcwICYgMTk4MicsXG4gIHVybDogJ2RhdGEvY2Fycy5qc29uJyxcbiAgaWQ6ICdjYXJzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NyaW1lYScsXG4gIHVybDogJ2RhdGEvY3JpbWVhLmpzb24nLFxuICBpZDogJ2NyaW1lYScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdEcml2aW5nJyxcbiAgdXJsOiAnZGF0YS9kcml2aW5nLmpzb24nLFxuICBpZDogJ2RyaXZpbmcnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnSXJpcycsXG4gIHVybDogJ2RhdGEvaXJpcy5qc29uJyxcbiAgaWQ6ICdpcmlzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0pvYnMnLFxuICB1cmw6ICdkYXRhL2pvYnMuanNvbicsXG4gIGlkOiAnam9icycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdQb3B1bGF0aW9uJyxcbiAgdXJsOiAnZGF0YS9wb3B1bGF0aW9uLmpzb24nLFxuICBpZDogJ3BvcHVsYXRpb24nLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnTW92aWVzJyxcbiAgdXJsOiAnZGF0YS9tb3ZpZXMuanNvbicsXG4gIGlkOiAnbW92aWVzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0JpcmRzdHJpa2VzJyxcbiAgdXJsOiAnZGF0YS9iaXJkc3RyaWtlcy5qc29uJyxcbiAgaWQ6ICdiaXJkc3RyaWtlcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCdXJ0aW4nLFxuICB1cmw6ICdkYXRhL2J1cnRpbi5qc29uJyxcbiAgaWQ6ICdidXJ0aW4nLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQnVkZ2V0IDIwMTYnLFxuICB1cmw6ICdkYXRhL2J1ZGdldC5qc29uJyxcbiAgaWQ6ICdidWRnZXQnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ2xpbWF0ZSBOb3JtYWxzJyxcbiAgdXJsOiAnZGF0YS9jbGltYXRlLmpzb24nLFxuICBpZDogJ2NsaW1hdGUnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ2FtcGFpZ25zJyxcbiAgdXJsOiAnZGF0YS93ZWJhbGwyNi5qc29uJyxcbiAgaWQ6ICd3ZWJhbGwyNicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2ZpZWxkSW5mbycsIGZ1bmN0aW9uIChEYXRhc2V0LCBEcm9wLCB2bCwgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZmllbGRpbmZvL2ZpZWxkaW5mby5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGQ6ICc9JyxcbiAgICAgICAgc2hvd1R5cGU6ICc9JyxcbiAgICAgICAgc2hvd0luZm86ICc9JyxcbiAgICAgICAgc2hvd0NhcmV0OiAnPScsXG4gICAgICAgIHBvcHVwQ29udGVudDogJz0nLFxuICAgICAgICBzaG93UmVtb3ZlOiAnPScsXG4gICAgICAgIHJlbW92ZUFjdGlvbjogJyYnLFxuICAgICAgICBhY3Rpb246ICcmJyxcbiAgICAgICAgZGlzYWJsZUNvdW50Q2FyZXQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBmdW5jc1BvcHVwO1xuXG4gICAgICAgIHNjb3BlLnR5cGVOYW1lcyA9IGNvbnN0cy50eXBlTmFtZXM7XG4gICAgICAgIHNjb3BlLnN0YXRzID0gRGF0YXNldC5zdGF0c1tzY29wZS5maWVsZC5uYW1lXTtcbiAgICAgICAgc2NvcGUuaXNUeXBlcyA9IHZsLmVuY0RlZi5pc1R5cGVzO1xuXG4gICAgICAgIHN3aXRjaChzY29wZS5maWVsZC50eXBlKXtcbiAgICAgICAgICBjYXNlICdPJzpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnZmEtZm9udCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdOJzpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnZmEtZm9udCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnaWNvbi1oYXNoJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ1QnOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdmYS1jYWxlbmRhcic7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlLmNsaWNrZWQgPSBmdW5jdGlvbigkZXZlbnQpe1xuICAgICAgICAgIGlmKHNjb3BlLmFjdGlvbiAmJiAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJy5mYS1jYXJldC1kb3duJylbMF0gJiZcbiAgICAgICAgICAgICRldmVudC50YXJnZXQgIT09IGVsZW1lbnQuZmluZCgnc3Bhbi50eXBlJylbMF0pIHtcbiAgICAgICAgICAgIHNjb3BlLmFjdGlvbigkZXZlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5mdW5jID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgICByZXR1cm4gZmllbGQuYWdncmVnYXRlIHx8IGZpZWxkLnRpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGQuYmluICYmICdiaW4nKSB8fFxuICAgICAgICAgICAgZmllbGQuX2FnZ3JlZ2F0ZSB8fCBmaWVsZC5fdGltZVVuaXQgfHxcbiAgICAgICAgICAgIChmaWVsZC5fYmluICYmICdiaW4nKSB8fCAoZmllbGQuX2FueSAmJiAnYXV0bycpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaCgncG9wdXBDb250ZW50JywgZnVuY3Rpb24ocG9wdXBDb250ZW50KSB7XG4gICAgICAgICAgaWYgKCFwb3B1cENvbnRlbnQpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCkge1xuICAgICAgICAgICAgZnVuY3NQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3NQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICAgIGNvbnRlbnQ6IHBvcHVwQ29udGVudCxcbiAgICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcudHlwZS1jYXJldCcpWzBdLFxuICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChmdW5jc1BvcHVwKSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBTZXJ2aWNlIGZvciB0aGUgc3BlYyBjb25maWcuXG4vLyBXZSBrZWVwIHRoaXMgc2VwYXJhdGUgc28gdGhhdCBjaGFuZ2VzIGFyZSBrZXB0IGV2ZW4gaWYgdGhlIHNwZWMgY2hhbmdlcy5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0NvbmZpZycsIGZ1bmN0aW9uKHZsLCBfKSB7XG4gICAgdmFyIENvbmZpZyA9IHt9O1xuXG4gICAgQ29uZmlnLnNjaGVtYSA9IHZsLnNjaGVtYS5zY2hlbWEucHJvcGVydGllcy5jb25maWc7XG4gICAgQ29uZmlnLmRhdGFzY2hlbWEgPSB2bC5zY2hlbWEuc2NoZW1hLnByb3BlcnRpZXMuZGF0YTtcblxuICAgIENvbmZpZy5kYXRhID0gdmwuc2NoZW1hLnV0aWwuaW5zdGFudGlhdGUoQ29uZmlnLmRhdGFzY2hlbWEpO1xuICAgIENvbmZpZy5jb25maWcgPSB2bC5zY2hlbWEudXRpbC5pbnN0YW50aWF0ZShDb25maWcuc2NoZW1hKTtcblxuICAgIENvbmZpZy5nZXRDb25maWcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfLmNsb25lRGVlcChDb25maWcuY29uZmlnKTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmdldERhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBDb25maWcuZGF0YTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmxhcmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzaW5nbGVXaWR0aDogNDAwLFxuICAgICAgICBzaW5nbGVIZWlnaHQ6IDQwMCxcbiAgICAgICAgbGFyZ2VCYW5kTWF4Q2FyZGluYWxpdHk6IDIwXG4gICAgICB9O1xuICAgIH07XG5cbiAgICBDb25maWcuc21hbGwgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0LCB0eXBlKSB7XG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudmFsdWVzID0gZGF0YXNldC52YWx1ZXM7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS51cmw7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBDb25maWcuZGF0YS51cmwgPSBkYXRhc2V0LnVybDtcbiAgICAgICAgZGVsZXRlIENvbmZpZy5kYXRhLnZhbHVlcztcbiAgICAgICAgQ29uZmlnLmRhdGEuZm9ybWF0VHlwZSA9IHR5cGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBDb25maWc7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkubG9nZ2VyXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbG9nZ2VyXG4gKiBTZXJ2aWNlIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0xvZ2dlcicsIGZ1bmN0aW9uICgkbG9jYXRpb24sICR3aW5kb3csIGNvbnN0cywgQW5hbHl0aWNzKSB7XG5cbiAgICB2YXIgc2VydmljZSA9IHt9O1xuXG4gICAgc2VydmljZS5sZXZlbHMgPSB7XG4gICAgICBPRkY6IHtpZDonT0ZGJywgcmFuazowfSxcbiAgICAgIFRSQUNFOiB7aWQ6J1RSQUNFJywgcmFuazoxfSxcbiAgICAgIERFQlVHOiB7aWQ6J0RFQlVHJywgcmFuazoyfSxcbiAgICAgIElORk86IHtpZDonSU5GTycsIHJhbms6M30sXG4gICAgICBXQVJOOiB7aWQ6J1dBUk4nLCByYW5rOjR9LFxuICAgICAgRVJST1I6IHtpZDonRVJST1InLCByYW5rOjV9LFxuICAgICAgRkFUQUw6IHtpZDonRkFUQUwnLCByYW5rOjZ9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuYWN0aW9ucyA9IHtcbiAgICAgIC8vIERBVEFcbiAgICAgIElOSVRJQUxJWkU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0lOSVRJQUxJWkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgVU5ETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnVU5ETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFJFRE86IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ1JFRE8nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX0NIQU5HRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX09QRU46IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1BBU1RFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19QQVNURScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1VSTDoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9ORVdfVVJMJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQk9PS01BUktcbiAgICAgIEJPT0tNQVJLX0FERDoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQUREJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfUkVNT1ZFOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19SRU1PVkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19PUEVOOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xPU0U6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xFQVI6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6ICdCT09LTUFSS19DTEVBUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIENIQVJUXG4gICAgICBDSEFSVF9NT1VTRU9WRVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1ZFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9NT1VTRU9VVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfUkVOREVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9SRU5ERVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfRVhQT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9FWFBPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQX0VORDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUF9FTkQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuXG4gICAgICBTT1JUX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonU09SVF9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLVFlQRV9UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J01BUktUWVBFX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fT1BFTjoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonRFJJTExfRE9XTl9PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRFJJTExfRE9XTl9DTE9TRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0RSSUxMX0RPV05fQ0xPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0dfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnTE9HX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFRSQU5TUE9TRV9UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdUUkFOU1BPU0VfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTlVMTF9GSUxURVJfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidOVUxMX0ZJTFRFUl9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIENMVVNURVJfU0VMRUNUOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDTFVTVEVSX1NFTEVDVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIExPQURfTU9SRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTE9BRF9NT1JFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBGSUVMRFNcbiAgICAgIEZJRUxEU19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEU19SRVNFVDoge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGSUVMRFNfUkVTRVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGVU5DX0NIQU5HRToge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGVU5DX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy9QT0xFU1RBUlxuICAgICAgU1BFQ19DSEFOR0U6IHtjYXRlZ29yeTonUE9MRVNUQVInLCBpZDogJ1NQRUNfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIEZJRUxEX0RST1A6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdGSUVMRF9EUk9QJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIE1BUktfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdQT0xFU1RBUicsIGlkOiAnTUFSS19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9XG4gICAgfTtcblxuICAgIHNlcnZpY2UubG9nSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24sIGxhYmVsLCBkYXRhKSB7XG4gICAgICBpZiAoIWNvbnN0cy5sb2dnaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciB2YWx1ZSA9IGRhdGEgPyBkYXRhLnZhbHVlIDogdW5kZWZpbmVkO1xuICAgICAgaWYoYWN0aW9uLmxldmVsLnJhbmsgPj0gc2VydmljZS5sZXZlbHMuSU5GTy5yYW5rKSB7XG4gICAgICAgIEFuYWx5dGljcy50cmFja0V2ZW50KGFjdGlvbi5jYXRlZ29yeSwgYWN0aW9uLmlkLCBsYWJlbCwgdmFsdWUpO1xuICAgICAgICBjb25zb2xlLmxvZygnW0xvZ2dpbmddICcsIGFjdGlvbi5pZCwgbGFiZWwsIGRhdGEpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uKHNlcnZpY2UuYWN0aW9ucy5JTklUSUFMSVpFLCBjb25zdHMuYXBwSWQpO1xuXG4gICAgcmV0dXJuIHNlcnZpY2U7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOm1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbW9kYWxcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdtb2RhbCcsIGZ1bmN0aW9uICgkZG9jdW1lbnQsIE1vZGFscykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ21vZGFsL21vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBhdXRvT3BlbjogJz0nLFxuICAgICAgICBtYXhXaWR0aDogJ0AnXG4gICAgICB9LFxuICAgICAgLy8gUHJvdmlkZSBhbiBpbnRlcmZhY2UgZm9yIGNoaWxkIGRpcmVjdGl2ZXMgdG8gY2xvc2UgdGhpcyBtb2RhbFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgIHZhciBtb2RhbElkID0gYXR0cnMuaWQ7XG5cbiAgICAgICAgaWYgKHNjb3BlLm1heFdpZHRoKSB7XG4gICAgICAgICAgc2NvcGUud3JhcHBlclN0eWxlID0gJ21heC13aWR0aDonICsgc2NvcGUubWF4V2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGNsb3NlZCB1bmxlc3MgYXV0b09wZW4gaXMgc2V0XG4gICAgICAgIHNjb3BlLmlzT3BlbiA9IHNjb3BlLmF1dG9PcGVuO1xuXG4gICAgICAgIC8vIGNsb3NlIG9uIGVzY1xuICAgICAgICBmdW5jdGlvbiBlc2NhcGUoZSkge1xuICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDI3ICYmIHNjb3BlLmlzT3Blbikge1xuICAgICAgICAgICAgc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYW5ndWxhci5lbGVtZW50KCRkb2N1bWVudCkub24oJ2tleWRvd24nLCBlc2NhcGUpO1xuXG4gICAgICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kYWwgd2l0aCB0aGUgc2VydmljZVxuICAgICAgICBNb2RhbHMucmVnaXN0ZXIobW9kYWxJZCwgc2NvcGUpO1xuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTW9kYWxzLmRlcmVnaXN0ZXIobW9kYWxJZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOm1vZGFsQ2xvc2VCdXR0b25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBtb2RhbENsb3NlQnV0dG9uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWxDbG9zZUJ1dHRvbicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ21vZGFsL21vZGFsY2xvc2VidXR0b24uaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJ15ebW9kYWwnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgJ2Nsb3NlQ2FsbGJhY2snOiAnJm9uQ2xvc2UnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgc2NvcGUuY2xvc2VNb2RhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIGlmIChzY29wZS5jbG9zZUNhbGxiYWNrKSB7XG4gICAgICAgICAgICBzY29wZS5jbG9zZUNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2bHVpLk1vZGFsc1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIE1vZGFsc1xuICogU2VydmljZSB1c2VkIHRvIGNvbnRyb2wgbW9kYWwgdmlzaWJpbGl0eSBmcm9tIGFueXdoZXJlIGluIHRoZSBhcHBsaWNhdGlvblxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdNb2RhbHMnLCBmdW5jdGlvbiAoJGNhY2hlRmFjdG9yeSkge1xuXG4gICAgLy8gVE9ETzogVGhlIHVzZSBvZiBzY29wZSBoZXJlIGFzIHRoZSBtZXRob2QgYnkgd2hpY2ggYSBtb2RhbCBkaXJlY3RpdmVcbiAgICAvLyBpcyByZWdpc3RlcmVkIGFuZCBjb250cm9sbGVkIG1heSBuZWVkIHRvIGNoYW5nZSB0byBzdXBwb3J0IHJldHJpZXZpbmdcbiAgICAvLyBkYXRhIGZyb20gYSBtb2RhbCBhcyBtYXkgYmUgbmVlZGVkIGluICM3N1xuICAgIHZhciBtb2RhbHNDYWNoZSA9ICRjYWNoZUZhY3RvcnkoJ21vZGFscycpO1xuXG4gICAgLy8gUHVibGljIEFQSVxuICAgIHJldHVybiB7XG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24oaWQsIHNjb3BlKSB7XG4gICAgICAgIGlmIChtb2RhbHNDYWNoZS5nZXQoaWQpKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignQ2Fubm90IHJlZ2lzdGVyIHR3byBtb2RhbHMgd2l0aCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbHNDYWNoZS5wdXQoaWQsIHNjb3BlKTtcbiAgICAgIH0sXG5cbiAgICAgIGRlcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIG1vZGFsc0NhY2hlLnJlbW92ZShpZCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBPcGVuIGEgbW9kYWxcbiAgICAgIG9wZW46IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBtb2RhbFNjb3BlID0gbW9kYWxzQ2FjaGUuZ2V0KGlkKTtcbiAgICAgICAgaWYgKCFtb2RhbFNjb3BlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignVW5yZWdpc3RlcmVkIG1vZGFsIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsU2NvcGUuaXNPcGVuID0gdHJ1ZTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIENsb3NlIGEgbW9kYWxcbiAgICAgIGNsb3NlOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgfSxcblxuICAgICAgZW1wdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmVBbGwoKTtcbiAgICAgIH0sXG5cbiAgICAgIGNvdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZGFsc0NhY2hlLmluZm8oKS5zaXplO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnRhYlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHRhYlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3RhYicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3RhYnMvdGFiLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXnRhYnNldCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGhlYWRpbmc6ICdAJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdGFic2V0Q29udHJvbGxlcikge1xuICAgICAgICB0YWJzZXRDb250cm9sbGVyLmFkZFRhYihzY29wZSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFic2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFic2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFic2V0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndGFicy90YWJzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcblxuICAgICAgLy8gSW50ZXJmYWNlIGZvciB0YWJzIHRvIHJlZ2lzdGVyIHRoZW1zZWx2ZXNcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50YWJzID0gW107XG5cbiAgICAgICAgdGhpcy5hZGRUYWIgPSBmdW5jdGlvbih0YWJTY29wZSkge1xuICAgICAgICAgIC8vIEZpcnN0IHRhYiBpcyBhbHdheXMgYXV0by1hY3RpdmF0ZWQ7IG90aGVycyBhdXRvLWRlYWN0aXZhdGVkXG4gICAgICAgICAgdGFiU2NvcGUuYWN0aXZlID0gc2VsZi50YWJzLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgICBzZWxmLnRhYnMucHVzaCh0YWJTY29wZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zaG93VGFiID0gZnVuY3Rpb24oc2VsZWN0ZWRUYWIpIHtcbiAgICAgICAgICBzZWxmLnRhYnMuZm9yRWFjaChmdW5jdGlvbih0YWIpIHtcbiAgICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCB0YWIsIGRlYWN0aXZhdGUgYWxsIG90aGVyc1xuICAgICAgICAgICAgdGFiLmFjdGl2ZSA9IHRhYiA9PT0gc2VsZWN0ZWRUYWI7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9LFxuXG4gICAgICAvLyBFeHBvc2UgY29udHJvbGxlciB0byB0ZW1wbGF0ZXMgYXMgXCJ0YWJzZXRcIlxuICAgICAgY29udHJvbGxlckFzOiAndGFic2V0J1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdCcsIGZ1bmN0aW9uKGRsLCB2bCwgdmcsICR0aW1lb3V0LCAkcSwgRGF0YXNldCwgQ29uZmlnLCBjb25zdHMsIF8sICRkb2N1bWVudCwgTG9nZ2VyLCBIZWFwLCAkd2luZG93KSB7XG4gICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgIHZhciBNQVhfQ0FOVkFTX1NJWkUgPSAzMjc2Ny8yLCBNQVhfQ0FOVkFTX0FSRUEgPSAyNjg0MzU0NTYvNDtcblxuICAgIHZhciByZW5kZXJRdWV1ZSA9IG5ldyBIZWFwKGZ1bmN0aW9uKGEsIGIpe1xuICAgICAgICByZXR1cm4gYi5wcmlvcml0eSAtIGEucHJpb3JpdHk7XG4gICAgICB9KSxcbiAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZ2V0UmVuZGVyZXIod2lkdGgsIGhlaWdodCkge1xuICAgICAgLy8gdXNlIGNhbnZhcyBieSBkZWZhdWx0IGJ1dCB1c2Ugc3ZnIGlmIHRoZSB2aXN1YWxpemF0aW9uIGlzIHRvbyBiaWdcbiAgICAgIGlmICh3aWR0aCA+IE1BWF9DQU5WQVNfU0laRSB8fCBoZWlnaHQgPiBNQVhfQ0FOVkFTX1NJWkUgfHwgd2lkdGgqaGVpZ2h0ID4gTUFYX0NBTlZBU19BUkVBKSB7XG4gICAgICAgIHJldHVybiAnc3ZnJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAnY2FudmFzJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICd2bHBsb3QvdmxwbG90Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJz0nLFxuICAgICAgICBpc0luTGlzdDogJz0nLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc9JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIG1heEhlaWdodDonPScsXG4gICAgICAgIG1heFdpZHRoOiAnPScsXG4gICAgICAgIG92ZXJmbG93OiAnPScsXG4gICAgICAgIHByaW9yaXR5OiAnPScsXG4gICAgICAgIHJlc2NhbGU6ICc9JyxcbiAgICAgICAgdGh1bWJuYWlsOiAnPScsXG4gICAgICAgIHRvb2x0aXA6ICc9JyxcbiAgICAgIH0sXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIEhPVkVSX1RJTUVPVVQgPSA1MDAsXG4gICAgICAgICAgVE9PTFRJUF9USU1FT1VUID0gMjUwO1xuXG4gICAgICAgIHNjb3BlLnZpc0lkID0gKGNvdW50ZXIrKyk7XG4gICAgICAgIHNjb3BlLmhvdmVyUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHNjb3BlLnRvb2x0aXBQcm9taXNlID0gbnVsbDtcbiAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9IGZhbHNlO1xuICAgICAgICBzY29wZS50b29sdGlwQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLmRlc3Ryb3llZCA9IGZhbHNlO1xuICAgICAgICB2YXIgZm9ybWF0ID0gdmwuZm9ybWF0KCcnKTtcblxuICAgICAgICBzY29wZS5tb3VzZW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5ob3ZlclByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX01PVVNFT1ZFUiwgJycsIHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gIXNjb3BlLnRodW1ibmFpbDtcbiAgICAgICAgICB9LCBIT1ZFUl9USU1FT1VUKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5tb3VzZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChzY29wZS5ob3ZlckZvY3VzKSB7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfTU9VU0VPVVQsICcnLCBzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChzY29wZS5ob3ZlclByb21pc2UpO1xuICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSBzY29wZS51bmxvY2tlZCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIHZpZXdPbk1vdXNlT3ZlcihldmVudCwgaXRlbSkge1xuICAgICAgICAgIGlmICghaXRlbSB8fCAhaXRlbS5kYXR1bSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHNjb3BlLnRvb2x0aXBQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24gYWN0aXZhdGVUb29sdGlwKCl7XG5cbiAgICAgICAgICAgIC8vIGF2b2lkIHNob3dpbmcgdG9vbHRpcCBmb3IgZmFjZXQncyBiYWNrZ3JvdW5kXG4gICAgICAgICAgICBpZiAoaXRlbS5kYXR1bS5fZmFjZXRJRCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBzY29wZS50b29sdGlwQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQLCBpdGVtLmRhdHVtKTtcblxuXG4gICAgICAgICAgICAvLyBjb252ZXJ0IGRhdGEgaW50byBhIGZvcm1hdCB0aGF0IHdlIGNhbiBlYXNpbHkgdXNlIHdpdGggbmcgdGFibGUgYW5kIG5nLXJlcGVhdFxuICAgICAgICAgICAgLy8gVE9ETzogcmV2aXNlIGlmIHRoaXMgaXMgYWN0dWFsbHkgYSBnb29kIGlkZWFcbiAgICAgICAgICAgIHNjb3BlLmRhdGEgPSBfKGl0ZW0uZGF0dW0pLm9taXQoJ19wcmV2JywgJ19pZCcpIC8vIG9taXQgdmVnYSBpbnRlcm5hbHNcbiAgICAgICAgICAgICAgLnBhaXJzKCkudmFsdWUoKVxuICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKHApIHtcbiAgICAgICAgICAgICAgICBwWzFdID0gZGwuaXNOdW1iZXIocFsxXSkgPyBmb3JtYXQocFsxXSkgOiBwWzFdO1xuICAgICAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcblxuICAgICAgICAgICAgdmFyIHRvb2x0aXAgPSBlbGVtZW50LmZpbmQoJy52aXMtdG9vbHRpcCcpLFxuICAgICAgICAgICAgICAkYm9keSA9IGFuZ3VsYXIuZWxlbWVudCgkZG9jdW1lbnQpLFxuICAgICAgICAgICAgICB3aWR0aCA9IHRvb2x0aXAud2lkdGgoKSxcbiAgICAgICAgICAgICAgaGVpZ2h0PSB0b29sdGlwLmhlaWdodCgpO1xuXG4gICAgICAgICAgICAvLyBwdXQgdG9vbHRpcCBhYm92ZSBpZiBpdCdzIG5lYXIgdGhlIHNjcmVlbidzIGJvdHRvbSBib3JkZXJcbiAgICAgICAgICAgIGlmIChldmVudC5wYWdlWSsxMCtoZWlnaHQgPCAkYm9keS5oZWlnaHQoKSkge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygndG9wJywgKGV2ZW50LnBhZ2VZKzEwKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygndG9wJywgKGV2ZW50LnBhZ2VZLTEwLWhlaWdodCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwdXQgdG9vbHRpcCBvbiBsZWZ0IGlmIGl0J3MgbmVhciB0aGUgc2NyZWVuJ3MgcmlnaHQgYm9yZGVyXG4gICAgICAgICAgICBpZiAoZXZlbnQucGFnZVgrMTArIHdpZHRoIDwgJGJvZHkud2lkdGgoKSkge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygnbGVmdCcsIChldmVudC5wYWdlWCsxMCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoJ2xlZnQnLCAoZXZlbnQucGFnZVgtMTAtd2lkdGgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCBUT09MVElQX1RJTUVPVVQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdmlld09uTW91c2VPdXQoZXZlbnQsIGl0ZW0pIHtcbiAgICAgICAgICAvL2NsZWFyIHBvc2l0aW9uc1xuICAgICAgICAgIHZhciB0b29sdGlwID0gZWxlbWVudC5maW5kKCcudmlzLXRvb2x0aXAnKTtcbiAgICAgICAgICB0b29sdGlwLmNzcygndG9wJywgbnVsbCk7XG4gICAgICAgICAgdG9vbHRpcC5jc3MoJ2xlZnQnLCBudWxsKTtcbiAgICAgICAgICAkdGltZW91dC5jYW5jZWwoc2NvcGUudG9vbHRpcFByb21pc2UpO1xuICAgICAgICAgIGlmIChzY29wZS50b29sdGlwQWN0aXZlKSB7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfVE9PTFRJUF9FTkQsIGl0ZW0uZGF0dW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzY29wZS50b29sdGlwQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgc2NvcGUuZGF0YSA9IFtdO1xuICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZnU3BlYygpIHtcbiAgICAgICAgICB2YXIgY29uZmlnU2V0ID0gc2NvcGUuY29uZmlnU2V0IHx8IGNvbnN0cy5kZWZhdWx0Q29uZmlnU2V0IHx8IHt9O1xuXG4gICAgICAgICAgaWYgKCFzY29wZS5jaGFydC52bFNwZWMpIHJldHVybjtcblxuICAgICAgICAgIHZhciB2bFNwZWMgPSBfLmNsb25lRGVlcChzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIHZsLmV4dGVuZCh2bFNwZWMuY29uZmlnLCBDb25maWdbY29uZmlnU2V0XSgpKTtcblxuICAgICAgICAgIC8vIHVzZSBjaGFydCBzdGF0cyBpZiBhdmFpbGFibGUgKGZvciBleGFtcGxlIGZyb20gYm9va21hcmtzKVxuICAgICAgICAgIHZhciBzdGF0cyA9IHNjb3BlLmNoYXJ0LnN0YXRzIHx8IERhdGFzZXQuc3RhdHM7XG5cbiAgICAgICAgICByZXR1cm4gdmwuY29tcGlsZSh2bFNwZWMsIHN0YXRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZpc0VsZW1lbnQoKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc2NhbGVJZkVuYWJsZSgpIHtcbiAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGdldFZpc0VsZW1lbnQoKTtcbiAgICAgICAgICBpZiAoc2NvcGUucmVzY2FsZSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byBkaWdlc3QgdGhlIHNjb3BlIHRvIGVuc3VyZSB0aGF0XG4gICAgICAgICAgICAvLyBlbGVtZW50LndpZHRoKCkgaXMgYm91bmQgYnkgcGFyZW50IGVsZW1lbnQhXG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB4UmF0aW8gPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAwLjIsXG4gICAgICAgICAgICAgICAgZWxlbWVudC53aWR0aCgpIC8gIC8qIHdpZHRoIG9mIHZscGxvdCBib3VuZGluZyBib3ggKi9cbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCAvKiB3aWR0aCBvZiB0aGUgdmlzICovXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICh4UmF0aW8gPCAxKSB7XG4gICAgICAgICAgICAgIHZpc0VsZW1lbnQud2lkdGgoc2NvcGUud2lkdGggKiB4UmF0aW8pXG4gICAgICAgICAgICAgICAgICAgICAgICAuaGVpZ2h0KHNjb3BlLmhlaWdodCAqIHhSYXRpbyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlzRWxlbWVudC5jc3MoJ3RyYW5zZm9ybScsIG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgLmNzcygndHJhbnNmb3JtLW9yaWdpbicsIG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNob3J0aGFuZCgpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuY2hhcnQuc2hvcnRoYW5kIHx8IChzY29wZS5jaGFydC52bFNwZWMgPyB2bC5FbmNvZGluZy5zaG9ydGhhbmQoc2NvcGUuY2hhcnQudmxTcGVjKSA6ICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbmRlclF1ZXVlTmV4dCgpIHtcbiAgICAgICAgICAvLyByZW5kZXIgbmV4dCBpdGVtIGluIHRoZSBxdWV1ZVxuICAgICAgICAgIGlmIChyZW5kZXJRdWV1ZS5zaXplKCkgPiAwKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IHJlbmRlclF1ZXVlLnBvcCgpO1xuICAgICAgICAgICAgbmV4dC5wYXJzZSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBvciBzYXkgdGhhdCBubyBvbmUgaXMgcmVuZGVyaW5nXG4gICAgICAgICAgICByZW5kZXJpbmcgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXIoc3BlYykge1xuICAgICAgICAgIGlmICghc3BlYykge1xuICAgICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3ZlcicpO1xuICAgICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzY29wZS5oZWlnaHQgPSBzcGVjLmhlaWdodDtcbiAgICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NhbiBub3QgZmluZCB2aXMgZWxlbWVudCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcblxuICAgICAgICAgIHNjb3BlLnJlbmRlcmVyID0gZ2V0UmVuZGVyZXIoc3BlYyk7XG5cbiAgICAgICAgICBmdW5jdGlvbiBwYXJzZVZlZ2EoKSB7XG4gICAgICAgICAgICAvLyBpZiBubyBsb25nZXIgYSBwYXJ0IG9mIHRoZSBsaXN0LCBjYW5jZWwhXG4gICAgICAgICAgICBpZiAoc2NvcGUuZGVzdHJveWVkIHx8IHNjb3BlLmRpc2FibGVkIHx8IChzY29wZS5pc0luTGlzdCAmJiBzY29wZS5jaGFydC5maWVsZFNldEtleSAmJiAhc2NvcGUuaXNJbkxpc3Qoc2NvcGUuY2hhcnQuZmllbGRTZXRLZXkpKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2FuY2VsIHJlbmRlcmluZycsIHNob3J0aGFuZCk7XG4gICAgICAgICAgICAgIHJlbmRlclF1ZXVlTmV4dCgpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgLy8gcmVuZGVyIGlmIHN0aWxsIGEgcGFydCBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgdmcucGFyc2Uuc3BlYyhzcGVjLCBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBlbmRQYXJzZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBudWxsO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBjaGFydCh7ZWw6IGVsZW1lbnRbMF19KTtcblxuICAgICAgICAgICAgICAgIGlmICghY29uc3RzLnVzZVVybCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5kYXRhKHtyYXc6IERhdGFzZXQuZGF0YX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyZXIoZ2V0UmVuZGVyZXIoc3BlYy53aWR0aCwgc2NvcGUuaGVpZ2h0KSk7XG4gICAgICAgICAgICAgICAgdmlldy51cGRhdGUoKTtcblxuICAgICAgICAgICAgICAgIHZhciB2aXNFbGVtZW50ID0gZWxlbWVudC5maW5kKCcudmVnYSA+IDpmaXJzdC1jaGlsZCcpO1xuICAgICAgICAgICAgICAgIC8vIHJlYWQgIDxjYW52YXM+Lzxzdmc+4oCZcyB3aWR0aCBhbmQgaGVpZ2h0LCB3aGljaCBpcyB2ZWdhJ3Mgb3V0ZXIgd2lkdGggYW5kIGhlaWdodCB0aGF0IGluY2x1ZGVzIGF4ZXMgYW5kIGxlZ2VuZHNcbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCA9ICB2aXNFbGVtZW50LndpZHRoKCk7XG4gICAgICAgICAgICAgICAgc2NvcGUuaGVpZ2h0ID0gdmlzRWxlbWVudC5oZWlnaHQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChjb25zdHMuZGVidWcpIHtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cudmlld3MgPSAkd2luZG93LnZpZXdzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgJHdpbmRvdy52aWV3c1tzaG9ydGhhbmRdID0gdmlldztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfUkVOREVSLCAnJywgc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICAgICAgICByZXNjYWxlSWZFbmFibGUoKTtcblxuICAgICAgICAgICAgICAgIHZhciBlbmRDaGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJzZSBzcGVjJywgKGVuZFBhcnNlLXN0YXJ0KSwgJ2NoYXJ0aW5nJywgKGVuZENoYXJ0LWVuZFBhcnNlKSwgc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUudG9vbHRpcCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5vbignbW91c2VvdmVyJywgdmlld09uTW91c2VPdmVyKTtcbiAgICAgICAgICAgICAgICAgIHZpZXcub24oJ21vdXNlb3V0Jywgdmlld09uTW91c2VPdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyUXVldWVOZXh0KCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFyZW5kZXJpbmcpIHsgLy8gaWYgbm8gaW5zdGFuY2UgaXMgYmVpbmcgcmVuZGVyIC0tIHJlbmRlcmluZyBub3dcbiAgICAgICAgICAgIHJlbmRlcmluZz10cnVlO1xuICAgICAgICAgICAgcGFyc2VWZWdhKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBxdWV1ZSBpdFxuICAgICAgICAgICAgcmVuZGVyUXVldWUucHVzaCh7XG4gICAgICAgICAgICAgIHByaW9yaXR5OiBzY29wZS5wcmlvcml0eSB8fCAwLFxuICAgICAgICAgICAgICBwYXJzZTogcGFyc2VWZWdhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlldztcbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIE9taXQgZGF0YSBwcm9wZXJ0eSB0byBzcGVlZCB1cCBkZWVwIHdhdGNoXG4gICAgICAgICAgcmV0dXJuIF8ub21pdChzY29wZS5jaGFydC52bFNwZWMsICdkYXRhJyk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzcGVjID0gc2NvcGUuY2hhcnQudmdTcGVjID0gZ2V0VmdTcGVjKCk7XG4gICAgICAgICAgaWYgKCFzY29wZS5jaGFydC5jbGVhblNwZWMpIHtcbiAgICAgICAgICAgIHNjb3BlLmNoYXJ0LmNsZWFuU3BlYyA9IHZsLkVuY29kaW5nLmZyb21TcGVjKHNjb3BlLmNoYXJ0LnZsU3BlYykudG9TcGVjKHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZW5kZXIoc3BlYyk7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygndmxwbG90IGRlc3Ryb3llZCcpO1xuICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdmVyJyk7XG4gICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdXQnKTtcbiAgICAgICAgICAgIHZpZXcgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgc2hvcnRoYW5kID0gZ2V0U2hvcnRoYW5kKCk7XG4gICAgICAgICAgaWYgKGNvbnN0cy5kZWJ1ZyAmJiAkd2luZG93LnZpZXdzKSB7XG4gICAgICAgICAgICBkZWxldGUgJHdpbmRvdy52aWV3c1tzaG9ydGhhbmRdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNjb3BlLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgICAgICAgLy8gRklYTUUgYW5vdGhlciB3YXkgdGhhdCBzaG91bGQgZWxpbWluYXRlIHRoaW5ncyBmcm9tIG1lbW9yeSBmYXN0ZXIgc2hvdWxkIGJlIHJlbW92aW5nXG4gICAgICAgICAgLy8gbWF5YmUgc29tZXRoaW5nIGxpa2VcbiAgICAgICAgICAvLyByZW5kZXJRdWV1ZS5zcGxpY2UocmVuZGVyUXVldWUuaW5kZXhPZihwYXJzZVZlZ2EpLCAxKSk7XG4gICAgICAgICAgLy8gYnV0IHdpdGhvdXQgcHJvcGVyIHRlc3RpbmcsIHRoaXMgaXMgcmlza2llciB0aGFuIHNldHRpbmcgc2NvcGUuZGVzdHJveWVkLlxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZGlyZWN0aXZlOnZpc0xpc3RJdGVtXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdmlzTGlzdEl0ZW1cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd2bFBsb3RHcm91cCcsIGZ1bmN0aW9uIChCb29rbWFya3MsIGNvbnN0cywgZGwsIHZsLCBEYXRhc2V0LCBMb2dnZXIsIF8pIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICd2bHBsb3Rncm91cC92bHBsb3Rncm91cC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCkge1xuICAgICAgICB0aGlzLmdldERyb3BUYXJnZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gJGVsZW1lbnQuZmluZCgnLmZhLXdyZW5jaCcpWzBdO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIC8qIHBhc3MgdG8gdmxwbG90ICoqL1xuICAgICAgICBjaGFydDogJz0nLFxuXG4gICAgICAgIC8vb3B0aW9uYWxcbiAgICAgICAgZGlzYWJsZWQ6ICc9JyxcbiAgICAgICAgaXNJbkxpc3Q6ICc9JyxcblxuICAgICAgICBhbHdheXNTY3JvbGxhYmxlOiAnPScsXG4gICAgICAgIGNvbmZpZ1NldDogJ0AnLFxuICAgICAgICBtYXhIZWlnaHQ6ICc9JyxcbiAgICAgICAgbWF4V2lkdGg6ICc9JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc9JyxcbiAgICAgICAgcHJpb3JpdHk6ICc9JyxcbiAgICAgICAgcmVzY2FsZTogJz0nLFxuICAgICAgICB0aHVtYm5haWw6ICc9JyxcbiAgICAgICAgdG9vbHRpcDogJz0nLFxuXG4gICAgICAgIC8qIHZscGxvdGdyb3VwIHNwZWNpZmljICovXG5cbiAgICAgICAgZmllbGRTZXQ6ICc9JyxcblxuICAgICAgICBzaG93Qm9va21hcms6ICdAJyxcbiAgICAgICAgc2hvd0RlYnVnOiAnPScsXG4gICAgICAgIHNob3dFeHBhbmQ6ICc9JyxcbiAgICAgICAgc2hvd0ZpbHRlck51bGw6ICdAJyxcbiAgICAgICAgc2hvd0xhYmVsOiAnQCcsXG4gICAgICAgIHNob3dMb2c6ICdAJyxcbiAgICAgICAgc2hvd01hcmtUeXBlOiAnQCcsXG4gICAgICAgIHNob3dTb3J0OiAnQCcsXG4gICAgICAgIHNob3dUcmFuc3Bvc2U6ICdAJyxcblxuICAgICAgICBhbHdheXNTZWxlY3RlZDogJz0nLFxuICAgICAgICBpc1NlbGVjdGVkOiAnPScsXG4gICAgICAgIGhpZ2hsaWdodGVkOiAnPScsXG4gICAgICAgIGV4cGFuZEFjdGlvbjogJyYnLFxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcblxuICAgICAgICAvLyBEZWZlciByZW5kZXJpbmcgdGhlIGRlYnVnIERyb3AgcG9wdXAgdW50aWwgaXQgaXMgcmVxdWVzdGVkXG4gICAgICAgIHNjb3BlLnJlbmRlclBvcHVwID0gZmFsc2U7XG4gICAgICAgIC8vIFVzZSBfLm9uY2UgYmVjYXVzZSB0aGUgcG9wdXAgb25seSBuZWVkcyB0byBiZSBpbml0aWFsaXplZCBvbmNlXG4gICAgICAgIHNjb3BlLmluaXRpYWxpemVQb3B1cCA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IHRydWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLmxvZ0NvZGUgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKG5hbWUrJzpcXG5cXG4nLCBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBMT0dcblxuICAgICAgICBzY29wZS5sb2cgPSB7fTtcbiAgICAgICAgc2NvcGUubG9nLnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjLCBlbmNUeXBlKSB7XG4gICAgICAgICAgaWYgKCFzcGVjKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgIHZhciBlbmNvZGluZyA9IHNwZWMuZW5jb2RpbmcsXG4gICAgICAgICAgICBmaWVsZCA9IGVuY29kaW5nW2VuY1R5cGVdO1xuXG4gICAgICAgICAgcmV0dXJuIGZpZWxkICYmIGZpZWxkLnR5cGUgPT09J1EnICYmICFmaWVsZC5iaW47XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUubG9nLnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMsIGVuY1R5cGUpIHtcbiAgICAgICAgICBpZiAoIXNjb3BlLmxvZy5zdXBwb3J0KHNwZWMsIGVuY1R5cGUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgdmFyIGZpZWxkID0gc3BlYy5lbmNvZGluZ1tlbmNUeXBlXSxcbiAgICAgICAgICAgIHNjYWxlID0gZmllbGQuc2NhbGUgPSBmaWVsZC5zY2FsZSB8fCB7fTtcblxuICAgICAgICAgIHNjYWxlLnR5cGUgPSBzY2FsZS50eXBlID09PSAnbG9nJyA/ICdsaW5lYXInIDogJ2xvZyc7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkxPR19UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG4gICAgICAgIH07XG4gICAgICAgIHNjb3BlLmxvZy5hY3RpdmUgPSBmdW5jdGlvbihzcGVjLCBlbmNUeXBlKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBlbmNUeXBlKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZCA9IHNwZWMuZW5jb2RpbmdbZW5jVHlwZV0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkLnNjYWxlID0gZmllbGQuc2NhbGUgfHwge307XG5cbiAgICAgICAgICByZXR1cm4gc2NhbGUudHlwZSA9PT0gJ2xvZyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVE9HR0xFIEZJTFRFUlxuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IHRvZ2dsZUZpbHRlck51bGwgdG8gYmUgaXRzIG93biBjbGFzc1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZUZpbHRlck51bGwgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLk5VTExfRklMVEVSX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcblxuICAgICAgICAgIHNwZWMuY29uZmlnID0gc3BlYy5jb25maWcgfHwge307XG4gICAgICAgICAgc3BlYy5jb25maWcuZmlsdGVyTnVsbCA9IHNwZWMuY29uZmlnLmZpbHRlck51bGwgfHwge1xuICAgICAgICAgICAgLy8gVE9ETzogaW5pdGlhdGUgdGhpcyBmcm9tIGZpbHRlck51bGwncyBzY2hlbWEgaW5zdGVhZFxuICAgICAgICAgICAgTjogZmFsc2UsXG4gICAgICAgICAgICBPOiBmYWxzZSxcbiAgICAgICAgICAgIFQ6IHRydWUsXG4gICAgICAgICAgICBROiB0cnVlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBzcGVjLmNvbmZpZy5maWx0ZXJOdWxsLk8gPSAhc3BlYy5jb25maWcuZmlsdGVyTnVsbC5PO1xuICAgICAgICAgIHNwZWMuY29uZmlnLmZpbHRlck51bGwuTiA9ICFzcGVjLmNvbmZpZy5maWx0ZXJOdWxsLk47XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudG9nZ2xlRmlsdGVyTnVsbC5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgc3RhdHMpIHtcbiAgICAgICAgICB2YXIgZmllbGRzID0gdmwuZW5jLmZpZWxkcyhzcGVjLmVuY29kaW5nKTtcbiAgICAgICAgICBmb3IgKHZhciBmaWVsZE5hbWUgaW4gZmllbGRzKSB7XG4gICAgICAgICAgICB2YXIgZmllbGRMaXN0ID0gZmllbGRzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgKGZpZWxkTGlzdC5jb250YWluc1R5cGUuTyB8fCBmaWVsZExpc3QuY29udGFpbnNUeXBlLk4pICYmXG4gICAgICAgICAgICAgICAgKGZpZWxkTmFtZSBpbiBzdGF0cykgJiZcbiAgICAgICAgICAgICAgICBzdGF0c1tmaWVsZE5hbWVdLm1pc3NpbmcgPiAwXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBTT1JUXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlU29ydCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgdmFyIHRvZ2dsZVNvcnQgPSBzY29wZS50b2dnbGVTb3J0ID0ge307XG5cbiAgICAgICAgdG9nZ2xlU29ydC5tb2RlcyA9IFsnb3JkaW5hbC1hc2NlbmRpbmcnLCAnb3JkaW5hbC1kZXNjZW5kaW5nJyxcbiAgICAgICAgICAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycsICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycsICdjdXN0b20nXTtcblxuICAgICAgICB0b2dnbGVTb3J0LnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU09SVF9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG4gICAgICAgICAgdmFyIGN1cnJlbnRNb2RlID0gdG9nZ2xlU29ydC5tb2RlKHNwZWMpO1xuICAgICAgICAgIHZhciBjdXJyZW50TW9kZUluZGV4ID0gdG9nZ2xlU29ydC5tb2Rlcy5pbmRleE9mKGN1cnJlbnRNb2RlKTtcblxuICAgICAgICAgIHZhciBuZXdNb2RlSW5kZXggPSAoY3VycmVudE1vZGVJbmRleCArIDEpICUgKHRvZ2dsZVNvcnQubW9kZXMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgdmFyIG5ld01vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW25ld01vZGVJbmRleF07XG5cbiAgICAgICAgICBjb25zb2xlLmxvZygndG9nZ2xlU29ydCcsIGN1cnJlbnRNb2RlLCBuZXdNb2RlKTtcblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG4gICAgICAgICAgc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0ID0gdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKiBHZXQgc29ydCBwcm9wZXJ0eSBkZWZpbml0aW9uIHRoYXQgbWF0Y2hlcyBlYWNoIG1vZGUuICovXG4gICAgICAgIHRvZ2dsZVNvcnQuZ2V0U29ydCA9IGZ1bmN0aW9uKG1vZGUsIHNwZWMpIHtcbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ29yZGluYWwtYXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuICdhc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChtb2RlID09PSAnb3JkaW5hbC1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuICdkZXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuICAgICAgICAgIHZhciBxRW5jRGVmID0gc3BlYy5lbmNvZGluZ1tjaGFubmVscy5xdWFudGl0YXRpdmVdO1xuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5uYW1lLFxuICAgICAgICAgICAgICBvcmRlcjogJ2FzY2VuZGluZydcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wOiBxRW5jRGVmLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgZmllbGQ6IHFFbmNEZWYubmFtZSxcbiAgICAgICAgICAgICAgb3JkZXI6ICdkZXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0Lm1vZGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgc29ydCA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydDtcblxuICAgICAgICAgIGlmIChzb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnb3JkaW5hbC1hc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxIDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBzb3J0IG1hdGNoZXMgYW55IG9mIHRoZSBzb3J0IGZvciBlYWNoIG1vZGUgZXhjZXB0ICdjdXN0b20nLlxuICAgICAgICAgICAgdmFyIG1vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW2ldO1xuICAgICAgICAgICAgdmFyIHNvcnRPZk1vZGUgPSB0b2dnbGVTb3J0LmdldFNvcnQobW9kZSwgc3BlYyk7XG5cbiAgICAgICAgICAgIGlmIChfLmlzRXF1YWwoc29ydCwgc29ydE9mTW9kZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGRsLmlzT2JqZWN0KHNvcnQpICYmIHNvcnQub3AgJiYgc29ydC5maWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuICdjdXN0b20nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdpbnZhbGlkIG1vZGUnKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0LmNoYW5uZWxzID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIHJldHVybiBzcGVjLmVuY29kaW5nLngudHlwZSA9PT0gJ04nIHx8IHNwZWMuZW5jb2RpbmcueC50eXBlID09PSAnTycgP1xuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd4JywgcXVhbnRpdGF0aXZlOiAneSd9IDpcbiAgICAgICAgICAgICAgICAgIHtvcmRpbmFsOiAneScsIHF1YW50aXRhdGl2ZTogJ3gnfTtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0LnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjLCBzdGF0cykge1xuICAgICAgICAgIHZhciBlbmMgPSBzcGVjLmVuY29kaW5nO1xuXG4gICAgICAgICAgaWYgKHZsLmVuYy5oYXMoZW5jLCAncm93JykgfHwgdmwuZW5jLmhhcyhlbmMsICdjb2wnKSB8fFxuICAgICAgICAgICAgIXZsLmVuYy5oYXMoZW5jLCAneCcpIHx8ICF2bC5lbmMuaGFzKGVuYywgJ3knKSB8fFxuICAgICAgICAgICAgIXZsLkVuY29kaW5nLmFsd2F5c05vT2NjbHVzaW9uKHNwZWMsIHN0YXRzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAoIHZsLmVuY0RlZi5pc1R5cGVzKGVuYy54LCBbJ04nLCAnTyddKSAmJiB2bC5lbmNEZWYuaXNNZWFzdXJlKGVuYy55KSkgPyAneCcgOlxuICAgICAgICAgICAgKCB2bC5lbmNEZWYuaXNUeXBlcyhlbmMueSwgWydOJywnTyddKSAmJiB2bC5lbmNEZWYuaXNNZWFzdXJlKGVuYy54KSkgPyAneScgOiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVTb3J0Q2xhc3MgPSBmdW5jdGlvbih2bFNwZWMpIHtcbiAgICAgICAgICBpZiAoIXZsU3BlYyB8fCAhdG9nZ2xlU29ydC5zdXBwb3J0KHZsU3BlYywgRGF0YXNldC5zdGF0cykpIHtcbiAgICAgICAgICAgIHJldHVybiAnaW52aXNpYmxlJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgb3JkaW5hbENoYW5uZWwgPSB2bFNwZWMgJiYgdG9nZ2xlU29ydC5jaGFubmVscyh2bFNwZWMpLm9yZGluYWwsXG4gICAgICAgICAgICBtb2RlID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQubW9kZSh2bFNwZWMpO1xuXG4gICAgICAgICAgdmFyIGRpcmVjdGlvbkNsYXNzID0gb3JkaW5hbENoYW5uZWwgPT09ICd4JyA/ICdzb3J0LXggJyA6ICcnO1xuXG4gICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsLWFzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFscGhhLWFzYyc7XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsLWRlc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1kZXNjJztcbiAgICAgICAgICAgIGNhc2UgJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbW91bnQtYXNjJztcbiAgICAgICAgICAgIGNhc2UgJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWRlc2MnO1xuICAgICAgICAgICAgZGVmYXVsdDogLy8gY3VzdG9tXG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0JztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudHJhbnNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlRSQU5TUE9TRV9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG4gICAgICAgICAgdmwuRW5jb2RpbmcudHJhbnNwb3NlKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmNoYXJ0ID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTp2aXNMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHZpc0xpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXBQb3B1cCcsIGZ1bmN0aW9uIChEcm9wKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl52bFBsb3RHcm91cCcsXG4gICAgICBzY29wZTogZmFsc2UsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIHZsUGxvdEdyb3VwQ29udHJvbGxlcikge1xuICAgICAgICB2YXIgZGVidWdQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy5kZXYtdG9vbCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogdmxQbG90R3JvdXBDb250cm9sbGVyLmdldERyb3BUYXJnZXQoKSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snLFxuICAgICAgICAgIGNvbnN0cmFpblRvV2luZG93OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWJ1Z1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignY29tcGFjdEpTT04nLCBmdW5jdGlvbihKU09OMykge1xuICAgIHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIEpTT04zLnN0cmluZ2lmeShpbnB1dCwgbnVsbCwgJyAgJywgODApO1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6ZW5jb2RlVXJpXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBlbmNvZGVVcmlcbiAqIEZpbHRlciBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2VuY29kZVVSSScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gd2luZG93LmVuY29kZVVSSShpbnB1dCk7XG4gICAgfTtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIGZhY2V0ZWR2aXouZmlsdGVyOnJlcG9ydFVybFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcmVwb3J0VXJsXG4gKiBGaWx0ZXIgaW4gdGhlIGZhY2V0ZWR2aXouXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigncmVwb3J0VXJsJywgZnVuY3Rpb24gKGNvbXBhY3RKU09ORmlsdGVyLCBfLCBjb25zdHMpIHtcbiAgICBmdW5jdGlvbiB2b3lhZ2VyUmVwb3J0KHBhcmFtcykge1xuICAgICAgdmFyIHVybCA9ICdodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kLzFUOVpBMTRGM21tenJIUjdKSlZVS3lQWHpyTXFGNTRDakxJT2p2MkU3WkVNL3ZpZXdmb3JtPyc7XG5cbiAgICAgIGlmIChwYXJhbXMuZmllbGRzKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihfLnZhbHVlcyhwYXJhbXMuZmllbGRzKSkpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEyNDUxOTk0Nzc9JyArIHF1ZXJ5ICsgJyYnO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLmVuY29kaW5nKSB7XG4gICAgICAgIHZhciBlbmNvZGluZyA9IF8ub21pdChwYXJhbXMuZW5jb2RpbmcsICdjb25maWcnKTtcbiAgICAgICAgZW5jb2RpbmcgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoZW5jb2RpbmcpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMzIzNjgwMTM2PScgKyBlbmNvZGluZyArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5lbmNvZGluZzIpIHtcbiAgICAgICAgdmFyIGVuY29kaW5nMiA9IF8ub21pdChwYXJhbXMuZW5jb2RpbmcyLCAnY29uZmlnJyk7XG4gICAgICAgIGVuY29kaW5nMiA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihlbmNvZGluZzIpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS44NTMxMzc3ODY9JyArIGVuY29kaW5nMiArICcmJztcbiAgICAgIH1cblxuICAgICAgdmFyIHR5cGVQcm9wID0gJ2VudHJ5LjE5NDAyOTI2Nzc9JztcbiAgICAgIHN3aXRjaCAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgY2FzZSAndmwnOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdWaXN1YWxpemF0aW9uK1JlbmRlcmluZysoVmVnYWxpdGUpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ZyJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrQWxnb3JpdGhtKyhWaXNyZWMpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Z2JzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrVUkrKEZhY2V0ZWRWaXopJic7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmx1aVJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xeEtzLXFHYUxaRVVmYlRtaGRtU29TMTNPS09FcHV1X05OV0U1VEFBbWxfWS92aWV3Zm9ybT8nO1xuICAgICAgaWYgKHBhcmFtcy5lbmNvZGluZykge1xuICAgICAgICB2YXIgZW5jb2RpbmcgPSBfLm9taXQocGFyYW1zLmVuY29kaW5nLCAnY29uZmlnJyk7XG4gICAgICAgIGVuY29kaW5nID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKGVuY29kaW5nKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTI0NTE5OTQ3Nz0nICsgZW5jb2RpbmcgKyAnJic7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHJldHVybiBjb25zdHMuYXBwSWQgPT09ICd2b3lhZ2VyJyA/IHZveWFnZXJSZXBvcnQgOiB2bHVpUmVwb3J0O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignc2NhbGVUeXBlJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICB2YXIgc2NhbGVUeXBlcyA9IHtcbiAgICAgICAgUTogJ1F1YW50aXRhdGl2ZScsXG4gICAgICAgIE46ICdOb21pbmFsJyxcbiAgICAgICAgTzogJ09yZGluYWwnLFxuICAgICAgICBUOiAnVGltZSdcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBzY2FsZVR5cGVzW2lucHV0XTtcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOnVuZGVyc2NvcmUyc3BhY2VcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHVuZGVyc2NvcmUyc3BhY2VcbiAqIEZpbHRlciBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ3VuZGVyc2NvcmUyc3BhY2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgcmV0dXJuIGlucHV0ID8gaW5wdXQucmVwbGFjZSgvXysvZywgJyAnKSA6ICcnO1xuICAgIH07XG4gIH0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==