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
window.     vlSchema = {
  "oneOf": [
    {
      "$ref": "#/definitions/ExtendedUnitSpec",
      "description": "Schema for a unit Vega-Lite specification, with the syntactic sugar extensions:\n\n- `row` and `column` are included in the encoding.\n\n- (Future) label, box plot\n\n\n\nNote: the spec could contain facet."
    },
    {
      "$ref": "#/definitions/FacetSpec"
    },
    {
      "$ref": "#/definitions/LayerSpec"
    }
  ],
  "definitions": {
    "ExtendedUnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/Encoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "Mark": {
      "type": "string",
      "enum": [
        "area",
        "bar",
        "line",
        "point",
        "text",
        "tick",
        "rule",
        "circle",
        "square",
        "errorBar"
      ]
    },
    "Encoding": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Vertical facets for trellis plots."
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Horizontal facets for trellis plots."
        },
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    },
    "PositionChannelDef": {
      "type": "object",
      "properties": {
        "axis": {
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Axis"
            }
          ]
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Axis": {
      "type": "object",
      "properties": {
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "format": {
          "description": "The formatting pattern for axis labels.",
          "type": "string"
        },
        "orient": {
          "$ref": "#/definitions/AxisOrient",
          "description": "The orientation of the axis. One of top, bottom, left or right. The orientation can be used to further specialize the axis type (e.g., a y axis oriented for the right edge of the chart)."
        },
        "title": {
          "description": "A title for the axis. Shows field name and its function by default.",
          "type": "string"
        },
        "values": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "AxisOrient": {
      "type": "string",
      "enum": [
        "top",
        "right",
        "left",
        "bottom"
      ]
    },
    "Scale": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/ScaleType"
        },
        "domain": {
          "description": "The domain of the scale, representing the set of data values. For quantitative data, this can take the form of a two-element array with minimum and maximum values. For ordinal/categorical data, this may be an array of valid input values.",
          "oneOf": [
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "range": {
          "description": "The range of the scale, representing the set of visual values. For numeric values, the range can take the form of a two-element array with minimum and maximum values. For ordinal or quantized data, the range may by an array of desired output values, which are mapped to elements in the specified domain. For ordinal scales only, the range can be defined using a DataRef: the range values are then drawn dynamically from a backing data set.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "round": {
          "description": "If true, rounds numeric output values to integers. This can be helpful for snapping to the pixel grid.",
          "type": "boolean"
        },
        "bandSize": {
          "minimum": 0,
          "type": "number"
        },
        "padding": {
          "description": "Applies spacing among ordinal elements in the scale range. The actual effect depends on how the scale is configured. If the __points__ parameter is `true`, the padding value is interpreted as a multiple of the spacing between points. A reasonable value is 1.0, such that the first and last point will be offset from the minimum and maximum value by half the distance between points. Otherwise, padding is typically in the range [0, 1] and corresponds to the fraction of space in the range interval to allocate to padding. A value of 0.5 means that the range band width will be equal to the padding width. For more, see the [D3 ordinal scale documentation](https://github.com/mbostock/d3/wiki/Ordinal-Scales).",
          "type": "number"
        },
        "clamp": {
          "description": "If true, values that exceed the data domain are clamped to either the minimum or maximum range value",
          "type": "boolean"
        },
        "nice": {
          "description": "If specified, modifies the scale domain to use a more human-friendly value range. If specified as a true boolean, modifies the scale domain to use a more human-friendly number range (e.g., 7 instead of 6.96). If specified as a string, modifies the scale domain to use a more human-friendly value range. For time and utc scale types only, the nice value should be a string indicating the desired time interval.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/NiceTime"
            }
          ]
        },
        "exponent": {
          "description": "Sets the exponent of the scale transformation. For pow scale types only, otherwise ignored.",
          "type": "number"
        },
        "zero": {
          "description": "If `true`, ensures that a zero baseline value is included in the scale domain.\n\nDefault value: `true` for `x` and `y` channel if the quantitative field is not binned\n\nand no custom `domain` is provided; `false` otherwise.",
          "type": "boolean"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        }
      }
    },
    "ScaleType": {
      "type": "string",
      "enum": [
        "linear",
        "log",
        "pow",
        "sqrt",
        "quantile",
        "quantize",
        "ordinal",
        "time",
        "utc"
      ]
    },
    "NiceTime": {
      "type": "string",
      "enum": [
        "second",
        "minute",
        "hour",
        "day",
        "week",
        "month",
        "year"
      ]
    },
    "SortField": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field name to aggregate over.",
          "type": "string"
        },
        "op": {
          "$ref": "#/definitions/AggregateOp",
          "description": "The sort aggregation operator"
        },
        "order": {
          "$ref": "#/definitions/SortOrder"
        }
      },
      "required": [
        "field",
        "op"
      ]
    },
    "AggregateOp": {
      "type": "string",
      "enum": [
        "values",
        "count",
        "valid",
        "missing",
        "distinct",
        "sum",
        "mean",
        "average",
        "variance",
        "variancep",
        "stdev",
        "stdevp",
        "median",
        "q1",
        "q3",
        "modeskew",
        "min",
        "max",
        "argmin",
        "argmax"
      ]
    },
    "SortOrder": {
      "type": "string",
      "enum": [
        "ascending",
        "descending",
        "none"
      ]
    },
    "Type": {
      "type": "string",
      "enum": [
        "quantitative",
        "ordinal",
        "temporal",
        "nominal"
      ]
    },
    "TimeUnit": {
      "type": "string",
      "enum": [
        "year",
        "month",
        "day",
        "date",
        "hours",
        "minutes",
        "seconds",
        "milliseconds",
        "yearmonth",
        "yearmonthdate",
        "yearmonthdatehours",
        "yearmonthdatehoursminutes",
        "yearmonthdatehoursminutesseconds",
        "hoursminutes",
        "hoursminutesseconds",
        "minutesseconds",
        "secondsmilliseconds",
        "quarter",
        "yearquarter",
        "quartermonth",
        "yearquartermonth"
      ]
    },
    "Bin": {
      "type": "object",
      "properties": {
        "min": {
          "description": "The minimum bin value to consider. If unspecified, the minimum value of the specified field is used.",
          "type": "number"
        },
        "max": {
          "description": "The maximum bin value to consider. If unspecified, the maximum value of the specified field is used.",
          "type": "number"
        },
        "base": {
          "description": "The number base to use for automatic bin determination (default is base 10).",
          "type": "number"
        },
        "step": {
          "description": "An exact step size to use between bins. If provided, options such as maxbins will be ignored.",
          "type": "number"
        },
        "steps": {
          "description": "An array of allowable step sizes to choose from.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "minstep": {
          "description": "A minimum allowable step size (particularly useful for integer values).",
          "type": "number"
        },
        "div": {
          "description": "Scale factors indicating allowable subdivisions. The default value is [5, 2], which indicates that for base 10 numbers (the default base), the method may consider dividing bin sizes by 5 and/or 2. For example, for an initial step size of 10, the method can check if bin sizes of 2 (= 10/5), 5 (= 10/2), or 1 (= 10/(5*2)) might also satisfy the given constraints.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "maxbins": {
          "description": "Maximum number of bins.",
          "minimum": 2,
          "type": "number"
        }
      }
    },
    "ChannelDefWithLegend": {
      "type": "object",
      "properties": {
        "legend": {
          "$ref": "#/definitions/Legend"
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Legend": {
      "type": "object",
      "properties": {
        "format": {
          "description": "An optional formatting pattern for legend labels. Vega uses D3\\'s format pattern.",
          "type": "string"
        },
        "title": {
          "description": "A title for the legend. (Shows field name and its function by default.)",
          "type": "string"
        },
        "values": {
          "description": "Explicitly set the visible legend values.",
          "type": "array",
          "items": {}
        },
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FieldDef": {
      "type": "object",
      "properties": {
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "OrderChannelDef": {
      "type": "object",
      "properties": {
        "sort": {
          "$ref": "#/definitions/SortOrder"
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Data": {
      "type": "object",
      "properties": {
        "format": {
          "$ref": "#/definitions/DataFormat",
          "description": "An object that specifies the format for the data file or values."
        },
        "url": {
          "description": "A URL from which to load the data set. Use the format.type property\n\nto ensure the loaded data is correctly parsed.",
          "type": "string"
        },
        "values": {
          "description": "Pass array of objects instead of a url to a file.",
          "type": "array",
          "items": {}
        }
      }
    },
    "DataFormat": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/DataFormatType",
          "description": "Type of input data: `\"json\"`, `\"csv\"`, `\"tsv\"`.\n\nThe default format type is determined by the extension of the file url.\n\nIf no extension is detected, `\"json\"` will be used by default."
        },
        "property": {
          "description": "JSON only) The JSON property containing the desired data.\n\nThis parameter can be used when the loaded JSON file may have surrounding structure or meta-data.\n\nFor example `\"property\": \"values.features\"` is equivalent to retrieving `json.values.features`\n\nfrom the loaded JSON object.",
          "type": "string"
        },
        "feature": {
          "description": "The name of the TopoJSON object set to convert to a GeoJSON feature collection.\n\nFor example, in a map of the world, there may be an object set named `\"countries\"`.\n\nUsing the feature property, we can extract this set and generate a GeoJSON feature object for each country.",
          "type": "string"
        },
        "mesh": {
          "description": "The name of the TopoJSON object set to convert to a mesh.\n\nSimilar to the `feature` option, `mesh` extracts a named TopoJSON object set.\n\nUnlike the `feature` option, the corresponding geo data is returned as a single, unified mesh instance, not as inidividual GeoJSON features.\n\nExtracting a mesh is useful for more efficiently drawing borders or other geographic elements that you do not need to associate with specific regions such as individual countries, states or counties.",
          "type": "string"
        }
      }
    },
    "DataFormatType": {
      "type": "string",
      "enum": [
        "json",
        "csv",
        "tsv",
        "topojson"
      ]
    },
    "Transform": {
      "type": "object",
      "properties": {
        "filter": {
          "description": "A string containing the filter Vega expression. Use `datum` to refer to the current data object.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "$ref": "#/definitions/EqualFilter"
            },
            {
              "$ref": "#/definitions/RangeFilter"
            },
            {
              "$ref": "#/definitions/InFilter"
            },
            {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "$ref": "#/definitions/EqualFilter"
                  },
                  {
                    "$ref": "#/definitions/RangeFilter"
                  },
                  {
                    "$ref": "#/definitions/InFilter"
                  }
                ]
              }
            }
          ]
        },
        "filterInvalid": {
          "description": "Whether to filter invalid values (`null` and `NaN`) from the data. By default (`undefined`), only quantitative and temporal fields are filtered. If set to `true`, all data items with null values are filtered. If `false`, all data items are included.",
          "type": "boolean"
        },
        "calculate": {
          "description": "Calculate new field(s) using the provided expresssion(s). Calculation are applied before filter.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/Formula",
            "description": "Formula object for calculate."
          }
        }
      }
    },
    "EqualFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered.",
          "type": "string"
        },
        "equal": {
          "description": "Value that the field should be equal to.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/DateTime",
              "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
            }
          ]
        }
      },
      "required": [
        "field",
        "equal"
      ]
    },
    "DateTime": {
      "type": "object",
      "properties": {
        "year": {
          "description": "Integer value representing the year.",
          "type": "number"
        },
        "quarter": {
          "description": "Integer value representing the quarter of the year (from 1-4).",
          "type": "number"
        },
        "month": {
          "description": "One of: (1) integer value representing the month from `1`-`12`. `1` represents January;  (2) case-insensitive month name (e.g., `\"January\"`);  (3) case-insensitive, 3-character short month name (e.g., `\"Jan\"`).",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "date": {
          "description": "Integer value representing the date from 1-31.",
          "type": "number"
        },
        "day": {
          "description": "Value representing the day of week.  This can be one of: (1) integer value -- `1` represents Monday; (2) case-insensitive day name (e.g., `\"Monday\"`);  (3) case-insensitive, 3-character short day name (e.g., `\"Mon\"`).   <br/> **Warning:** A DateTime definition object with `day`** should not be combined with `year`, `quarter`, `month`, or `date`.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "hours": {
          "description": "Integer value representing the hour of day from 0-23.",
          "type": "number"
        },
        "minutes": {
          "description": "Integer value representing minute segment of a time from 0-59.",
          "type": "number"
        },
        "seconds": {
          "description": "Integer value representing second segment of a time from 0-59.",
          "type": "number"
        },
        "milliseconds": {
          "description": "Integer value representing millisecond segment of a time.",
          "type": "number"
        }
      }
    },
    "RangeFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "range": {
          "description": "Array of inclusive minimum and maximum values\n\nfor a field value of a data item to be included in the filtered data.",
          "maxItems": 2,
          "minItems": 2,
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "number"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "range"
      ]
    },
    "InFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "in": {
          "description": "A set of values that the `field`'s value should be a member of,\n\nfor a data item included in the filtered data.",
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "number"
              },
              {
                "type": "boolean"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "in"
      ]
    },
    "Formula": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field in which to store the computed formula value.",
          "type": "string"
        },
        "expr": {
          "description": "A string containing an expression for the formula. Use the variable `datum` to to refer to the current data object.",
          "type": "string"
        }
      },
      "required": [
        "field",
        "expr"
      ]
    },
    "Config": {
      "type": "object",
      "properties": {
        "viewport": {
          "description": "The width and height of the on-screen viewport, in pixels. If necessary, clipping and scrolling will be applied.",
          "type": "number"
        },
        "background": {
          "description": "CSS color property to use as background of visualization. Default is `\"transparent\"`.",
          "type": "string"
        },
        "numberFormat": {
          "description": "D3 Number format for axis labels and text tables. For example \"s\" for SI units.",
          "type": "string"
        },
        "timeFormat": {
          "description": "Default datetime format for axis and legend labels. The format can be set directly on each axis and legend.",
          "type": "string"
        },
        "countTitle": {
          "description": "Default axis and legend title for count fields.",
          "type": "string"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Cell Config"
        },
        "mark": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Mark Config"
        },
        "overlay": {
          "$ref": "#/definitions/OverlayConfig",
          "description": "Mark Overlay Config"
        },
        "scale": {
          "$ref": "#/definitions/ScaleConfig",
          "description": "Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Axis Config"
        },
        "legend": {
          "$ref": "#/definitions/LegendConfig",
          "description": "Legend Config"
        },
        "facet": {
          "$ref": "#/definitions/FacetConfig",
          "description": "Facet Config"
        }
      }
    },
    "CellConfig": {
      "type": "object",
      "properties": {
        "width": {
          "type": "number"
        },
        "height": {
          "type": "number"
        },
        "clip": {
          "type": "boolean"
        },
        "fill": {
          "description": "The fill color.",
          "format": "color",
          "type": "string"
        },
        "fillOpacity": {
          "description": "The fill opacity (value between [0,1]).",
          "type": "number"
        },
        "stroke": {
          "description": "The stroke color.",
          "type": "string"
        },
        "strokeOpacity": {
          "description": "The stroke opacity (value between [0,1]).",
          "type": "number"
        },
        "strokeWidth": {
          "description": "The stroke width, in pixels.",
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        }
      }
    },
    "MarkConfig": {
      "type": "object",
      "properties": {
        "filled": {
          "description": "Whether the shape\\'s color should be used as fill color instead of stroke color.\n\nThis is only applicable for \"bar\", \"point\", and \"area\".\n\nAll marks except \"point\" marks are filled by default.\n\nSee Mark Documentation (http://vega.github.io/vega-lite/docs/marks.html)\n\nfor usage example.",
          "type": "boolean"
        },
        "color": {
          "description": "Default color.",
          "format": "color",
          "type": "string"
        },
        "fill": {
          "description": "Default Fill Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "stroke": {
          "description": "Default Stroke Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "fillOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeWidth": {
          "minimum": 0,
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        },
        "stacked": {
          "$ref": "#/definitions/StackOffset"
        },
        "orient": {
          "$ref": "#/definitions/Orient",
          "description": "The orientation of a non-stacked bar, tick, area, and line charts.\n\nThe value is either horizontal (default) or vertical.\n\n- For bar, rule and tick, this determines whether the size of the bar and tick\n\nshould be applied to x or y dimension.\n\n- For area, this property determines the orient property of the Vega output.\n\n- For line, this property determines the sort order of the points in the line\n\nif `config.sortLineBy` is not specified.\n\nFor stacked charts, this is always determined by the orientation of the stack;\n\ntherefore explicitly specified value will be ignored."
        },
        "interpolate": {
          "$ref": "#/definitions/Interpolate",
          "description": "The line interpolation method to use. One of linear, step-before, step-after, basis, basis-open, cardinal, cardinal-open, monotone."
        },
        "tension": {
          "description": "Depending on the interpolation type, sets the tension parameter.",
          "type": "number"
        },
        "lineSize": {
          "description": "Size of line mark.",
          "type": "number"
        },
        "ruleSize": {
          "description": "Size of rule mark.",
          "type": "number"
        },
        "barSize": {
          "description": "The size of the bars.  If unspecified, the default size is  `bandSize-1`,\n\nwhich provides 1 pixel offset between bars.",
          "type": "number"
        },
        "barThinSize": {
          "description": "The size of the bars on continuous scales.",
          "type": "number"
        },
        "shape": {
          "description": "The symbol shape to use. One of circle (default), square, cross, diamond, triangle-up, or triangle-down, or a custom SVG path.",
          "oneOf": [
            {
              "$ref": "#/definitions/Shape"
            },
            {
              "type": "string"
            }
          ]
        },
        "size": {
          "description": "The pixel area each the point. For example: in the case of circles, the radius is determined in part by the square root of the size value.",
          "type": "number"
        },
        "tickSize": {
          "description": "The width of the ticks.",
          "type": "number"
        },
        "tickThickness": {
          "description": "Thickness of the tick mark.",
          "type": "number"
        },
        "align": {
          "$ref": "#/definitions/HorizontalAlign",
          "description": "The horizontal alignment of the text. One of left, right, center."
        },
        "angle": {
          "description": "The rotation angle of the text, in degrees.",
          "type": "number"
        },
        "baseline": {
          "$ref": "#/definitions/VerticalAlign",
          "description": "The vertical alignment of the text. One of top, middle, bottom."
        },
        "dx": {
          "description": "The horizontal offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "dy": {
          "description": "The vertical offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "radius": {
          "description": "Polar coordinate radial offset, in pixels, of the text label from the origin determined by the x and y properties.",
          "type": "number"
        },
        "theta": {
          "description": "Polar coordinate angle, in radians, of the text label from the origin determined by the x and y properties. Values for theta follow the same convention of arc mark startAngle and endAngle properties: angles are measured in radians, with 0 indicating \"north\".",
          "type": "number"
        },
        "font": {
          "description": "The typeface to set the text in (e.g., Helvetica Neue).",
          "type": "string"
        },
        "fontSize": {
          "description": "The font size, in pixels.",
          "type": "number"
        },
        "fontStyle": {
          "$ref": "#/definitions/FontStyle",
          "description": "The font style (e.g., italic)."
        },
        "fontWeight": {
          "$ref": "#/definitions/FontWeight",
          "description": "The font weight (e.g., bold)."
        },
        "format": {
          "description": "The formatting pattern for text value. If not defined, this will be determined automatically.",
          "type": "string"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "text": {
          "description": "Placeholder Text",
          "type": "string"
        },
        "applyColorToBackground": {
          "description": "Apply color field to background color instead of the text.",
          "type": "boolean"
        }
      }
    },
    "StackOffset": {
      "type": "string",
      "enum": [
        "zero",
        "center",
        "normalize",
        "none"
      ]
    },
    "Orient": {
      "type": "string",
      "enum": [
        "horizontal",
        "vertical"
      ]
    },
    "Interpolate": {
      "type": "string",
      "enum": [
        "linear",
        "linear-closed",
        "step",
        "step-before",
        "step-after",
        "basis",
        "basis-open",
        "basis-closed",
        "cardinal",
        "cardinal-open",
        "cardinal-closed",
        "bundle",
        "monotone"
      ]
    },
    "Shape": {
      "type": "string",
      "enum": [
        "circle",
        "square",
        "cross",
        "diamond",
        "triangle-up",
        "triangle-down"
      ]
    },
    "HorizontalAlign": {
      "type": "string",
      "enum": [
        "left",
        "right",
        "center"
      ]
    },
    "VerticalAlign": {
      "type": "string",
      "enum": [
        "top",
        "middle",
        "bottom"
      ]
    },
    "FontStyle": {
      "type": "string",
      "enum": [
        "normal",
        "italic"
      ]
    },
    "FontWeight": {
      "type": "string",
      "enum": [
        "normal",
        "bold"
      ]
    },
    "OverlayConfig": {
      "type": "object",
      "properties": {
        "line": {
          "description": "Whether to overlay line with point.",
          "type": "boolean"
        },
        "area": {
          "$ref": "#/definitions/AreaOverlay",
          "description": "Type of overlay for area mark (line or linepoint)"
        },
        "pointStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        },
        "lineStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        }
      }
    },
    "AreaOverlay": {
      "type": "string",
      "enum": [
        "line",
        "linepoint",
        "none"
      ]
    },
    "ScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "description": "If true, rounds numeric output values to integers.\n\nThis can be helpful for snapping to the pixel grid.\n\n(Only available for `x`, `y`, `size`, `row`, and `column` scales.)",
          "type": "boolean"
        },
        "textBandWidth": {
          "description": "Default band width for `x` ordinal scale when is mark is `text`.",
          "minimum": 0,
          "type": "number"
        },
        "bandSize": {
          "description": "Default band size for (1) `y` ordinal scale,\n\nand (2) `x` ordinal scale when the mark is not `text`.",
          "minimum": 0,
          "type": "number"
        },
        "opacity": {
          "description": "Default range for opacity.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "padding": {
          "description": "Default padding for `x` and `y` ordinal scales.",
          "type": "number"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        },
        "nominalColorRange": {
          "description": "Default range for nominal color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "sequentialColorRange": {
          "description": "Default range for ordinal / continuous color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "shapeRange": {
          "description": "Default range for shape",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "barSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "fontSizeRange": {
          "description": "Default range for font size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "ruleSizeRange": {
          "description": "Default range for rule stroke widths",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "tickSizeRange": {
          "description": "Default range for tick spans",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "pointSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        }
      }
    },
    "AxisConfig": {
      "type": "object",
      "properties": {
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "LegendConfig": {
      "type": "object",
      "properties": {
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FacetConfig": {
      "type": "object",
      "properties": {
        "scale": {
          "$ref": "#/definitions/FacetScaleConfig",
          "description": "Facet Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Facet Axis Config"
        },
        "grid": {
          "$ref": "#/definitions/FacetGridConfig",
          "description": "Facet Grid Config"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Facet Cell Config"
        }
      }
    },
    "FacetScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "type": "boolean"
        },
        "padding": {
          "type": "number"
        }
      }
    },
    "FacetGridConfig": {
      "type": "object",
      "properties": {
        "color": {
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "type": "number"
        },
        "offset": {
          "type": "number"
        }
      }
    },
    "FacetSpec": {
      "type": "object",
      "properties": {
        "facet": {
          "$ref": "#/definitions/Facet"
        },
        "spec": {
          "oneOf": [
            {
              "$ref": "#/definitions/LayerSpec"
            },
            {
              "$ref": "#/definitions/UnitSpec"
            }
          ]
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "facet",
        "spec"
      ]
    },
    "Facet": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef"
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef"
        }
      }
    },
    "LayerSpec": {
      "type": "object",
      "properties": {
        "layers": {
          "description": "Unit specs that will be layered.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/UnitSpec"
          }
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "layers"
      ]
    },
    "UnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/UnitEncoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "UnitEncoding": {
      "type": "object",
      "properties": {
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
};
}());

;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
    'LocalStorageModule',
    'angular-google-analytics',
    'angular-sortable-view',
    'angular-websql'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('vl', window.vl)
  .constant('cql', window.cql)
  .constant('vlSchema', window.vlSchema)
  .constant('vg', window.vg)
  .constant('util', window.vg.util)
  // other libraries
  .constant('jQuery', window.$)
  .constant('Papa', window.Papa)
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  .constant('ANY', '__ANY__')
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    logLevel: 'INFO',
    logToWebSql: false, // in user studies, set this to true
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
    defaultTimeFn: 'year'
  });
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <input ng-model=\"myriaRestUrl\"><button ng-click=\"loadDatasets(\'\')\">update</button>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("components/alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("components/bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button close-action=\"Bookmarks.logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.list.length }})</h2><a class=\"bookmark-list-util\" ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a> <a class=\"bookmark-list-util\" ng-click=\"Bookmarks.export()\"><i class=\"fa fa-clipboard\"></i> Export</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.list.length > 0\" class=\"hflex flex-wrap\" sv-root=\"\" sv-part=\"Bookmarks.list\" sv-on-sort=\"Bookmarks.reorder()\"><vl-plot-group ng-repeat=\"bookmark in Bookmarks.list | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" chart=\"bookmark.chart\" field-set=\"bookmark.chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\" sv-element=\"\"></vl-plot-group><div sv-placeholder=\"\"></div></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.list.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("components/channelshelf/channelshelf.html","<div class=\"shelf-group\"><div class=\"shelf\" ng-class=\"{disabled: disabled || !supportMark(channelId, mark), \'any\': isAnyChannel}\"><div class=\"shelf-label\" ng-class=\"{expanded: propsExpanded}\">{{ isAnyChannel ? \'any\' : channelId }}</div><div class=\"field-drop\" ng-model=\"pills[channelId]\" data-drop=\"!disabled && supportMark(channelId, mark)\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\"><field-info ng-show=\"encoding[channelId].field\" ng-class=\"{ expanded: funcsExpanded, any: isAnyField, \'enumerated-field\': isEnumeratedField, \'enumerated-channel\': isEnumeratedChannel, highlighted: isHighlighted(channelId) }\" field-def=\"encoding[channelId]\" show-type=\"true\" show-caret=\"true\" disable-count-caret=\"true\" popup-content=\"fieldInfoPopupContent\" show-remove=\"true\" remove-action=\"removeField()\" class=\"selected draggable full-width\" data-drag=\"true\" ng-model=\"pills[channelId]\" jqyoui-draggable=\"{onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\"></field-info><span class=\"placeholder\" ng-if=\"!encoding[channelId].field\">drop a field here</span></div></div><div class=\"drop-container\"><div class=\"popup-menu shelf-properties shelf-properties-{{channelId}}\"><div><property-editor ng-show=\"schema.properties.value\" id=\"channelId + \'value\'\" type=\"schema.properties.value.type\" enum=\"schema.properties.value.enum\" prop-name=\"\'value\'\" group=\"encoding[channelId]\" description=\"schema.properties.value.description\" min=\"schema.properties.value.minimum\" max=\"schema.properties.value.maximum\" role=\"schema.properties.value.role\" default=\"schema.properties.value.default\"></property-editor></div><div ng-repeat=\"group in [\'legend\', \'scale\', \'axis\', \'bin\']\" ng-show=\"schema.properties[group]\"><h4>{{ group }}</h4><div ng-repeat=\"(propName, scaleProp) in schema.properties[group].properties\" ng-init=\"id = channelId + group + $index\" ng-show=\"scaleProp.supportedTypes ? scaleProp.supportedTypes[encoding[channelId].type] : true\"><property-editor id=\"id\" type=\"scaleProp.type\" enum=\"scaleProp.enum\" prop-name=\"propName\" group=\"encoding[channelId][group]\" description=\"scaleProp.description\" min=\"scaleProp.minimum\" max=\"scaleProp.maximum\" role=\"scaleProp.role\" default=\"scaleProp.default\"></property-editor></div></div></div><div class=\"popup-menu shelf-functions shelf-functions-{{channelId}}\"><function-select ng-if=\"!preview\" field-def=\"encoding[channelId]\" channel-id=\"channelId\"></function-select><div class=\"mb5\" ng-if=\"allowedTypes.length>1\"><h4>Type</h4><label class=\"type-label\" ng-repeat=\"type in allowedTypes\"><input type=\"radio\" ng-value=\"type\" ng-model=\"encoding[channelId].type\"> {{type}}</label></div></div></div></div>");
$templateCache.put("components/fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCountCaret || fieldDef.aggregate!==\'count\'}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeName}}\"></span></span> <span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(fieldDef)\" class=\"field-func\" title=\"{{ func(fieldDef) }}\" ng-class=\"{any: fieldDef._any}\">{{ func(fieldDef) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(fieldDef), any: fieldDef._any}\">{{ (fieldDef.title || fieldDef.field) | underscore2space }}</span></span> <span ng-if=\"fieldDef.aggregate===\'count\' || fieldDef.autoCount\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink add\" ng-show=\"showAdd\"><a class=\"add-field\" ng-click=\"addAction()\"><i class=\"fa fa-plus\"></i></a></span> <span class=\"no-shrink info\" ng-show=\"showInfo && !isEnumSpec(fieldDef.field)\"><i ng-if=\"fieldDef.aggregate !== \'count\' && containsType([vlType.NOMINAL, vlType.ORDINAL], fieldDef.type)\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min}}<br> <strong>Max:</strong> {{stats.max}}<br> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"fieldDef.aggregate !== \'count\' && fieldDef.type === vlType.TEMPORAL\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | date: short}}<br> <strong>Max:</strong> {{stats.max | date: short}}<br> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"fieldDef.aggregate !== \'count\' && fieldDef.type === vlType.QUANTITATIVE\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | number}}<br> <strong>Max:</strong> {{stats.max | number}}<br> <strong>Stdev:</strong> {{stats.stdev | number:2}}<br> <strong>Mean:</strong> {{stats.mean | number:2}}<br> <strong>Median:</strong> {{stats.median | number}}<br> </div>\" tooltip-side=\"right\"></i><i ng-if=\"fieldDef.aggregate === \'count\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Count:</strong> {{stats.max}} </div>\" tooltip-side=\"right\"></i></span></span></span>");
$templateCache.put("components/functionselect/functionselect.html","<div class=\"mb5\" ng-if=\"func.list.aboveFold.length > 1 || func.list.aboveFold[0] !== undefined\"><h4>Function</h4><div><label class=\"func-label field-func\" ng-repeat=\"f in func.list.aboveFold\" ng-class=\"{none: !f}\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f || \'NONE\'}}</label></div><div ng-show=\"showAllFunctions\"><label class=\"func-label field-func\" ng-class=\"{\'single-column\': func.isTemporal}\" ng-repeat=\"f in func.list.belowFold\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f}}</label></div><div ng-hide=\"func.isCount\" class=\"expand-collapse\"><a ng-click=\"showAllFunctions=!showAllFunctions\"><span ng-show=\"!showAllFunctions\">more <i class=\"fa fa-angle-down\" aria-hidden=\"true\"></i></span> <span ng-show=\"showAllFunctions\">less <i class=\"fa fa-angle-up\" aria-hidden=\"true\"></i></span></a></div></div>");
$templateCache.put("components/modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("components/propertyeditor/propertyeditor.html","<div><label class=\"prop-label\" for=\"{{ id }}\"><span class=\"name\" title=\"{{ propName }}\">{{ propName }}</span> <span ng-if=\"description\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<strong>{{ propName }}</strong><div class=\'tooltip-content\'>{{ description }}</div>\" tooltip-side=\"right\"></span></label><form class=\"inline-block\" ng-switch=\"type + (enum !== undefined ? \'list\' : \'\')\"><input id=\"{{ id }}\" ng-switch-when=\"boolean\" type=\"checkbox\" ng-model=\"group[propName]\" ng-hide=\"automodel.value\"><select id=\"{{ id }}\" ng-switch-when=\"stringlist\" ng-model=\"group[propName]\" ng-options=\"choice for choice in enum track by choice\" ng-hide=\"automodel.value\"></select><input id=\"{{ id }}\" ng-switch-when=\"integer\" ng-attr-type=\"{{ isRange ? \'range\' : \'number\'}}\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 200}\" ng-attr-min=\"{{min}}\" ng-attr-max=\"{{max}}\" ng-hide=\"automodel.value\" ng-attr-title=\"{{ isRange ? group[propName] : undefined }}\"> <input id=\"{{ id }}\" ng-attr-type=\"{{ role === \'color\' ? \'color\' : \'string\' }}\" ng-switch-when=\"string\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 500}\" ng-hide=\"automodel.value\"> <small ng-if=\"hasAuto\"><label>Auto <input ng-model=\"automodel.value\" type=\"checkbox\"></label></small></form></div>");
$templateCache.put("components/schemalist/schemalist.html","<div class=\"schema no-top-margin full-width\"><schema-list-item ng-repeat=\"fieldDef in fieldDefs | orderBy : orderBy\" field-def=\"fieldDef\" show-add=\"showAdd\"></schema-list-item></div>");
$templateCache.put("components/schemalist/schemalistitem.html","<field-info field-def=\"fieldDef\" show-type=\"true\" show-add=\"showAdd\" class=\"pill list-item draggable full-width no-right-margin\" ng-class=\"{any: isEnumSpec(fieldDef.field)}\" ng-model=\"pill\" ng-dblclick=\"fieldAdd(fieldDef)\" add-action=\"fieldAdd(fieldDef)\" data-drag=\"true\" jqyoui-draggable=\"{placeholder: \'keep\', deepCopy: true, onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\"></field-info>");
$templateCache.put("components/shelves/shelves.html","<div class=\"card shelves no-top-margin no-right-margin abs-100\"><a class=\"right\" ng-click=\"clear()\"><i class=\"fa fa-eraser\"></i> Clear</a><h2>Encoding</h2><div class=\"shelf-pane shelf-encoding-pane full-width\"><h3>Positional</h3><channel-shelf channel-id=\"\'x\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'y\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'column\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\" disabled=\"!spec.encoding.x.field\">></channel-shelf><channel-shelf channel-id=\"\'row\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\" disabled=\"!spec.encoding.y.field\"></channel-shelf></div><div class=\"shelf-pane shelf-marks-pane full-width\"><div class=\"right\"><select class=\"markselect\" ng-model=\"spec.mark\" ng-class=\"{auto: spec.mark === ANY}\" ng-options=\"(type === ANY ? \'auto\' : type) for type in (supportAny ? marksWithAny : marks)\" ng-change=\"markChange()\"></select></div><h3>Marks</h3><channel-shelf channel-id=\"\'size\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'color\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'shape\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'detail\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'text\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf></div><div class=\"shelf-pane shelf-any-pane full-width\" ng-if=\"supportAny && !preview\"><h3>Automatic</h3><channel-shelf ng-repeat=\"channelId in anyChannelIds\" preview=\"preview\" channel-id=\"channelId\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf></div></div>");
$templateCache.put("components/tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("components/tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && (maxHeight && (!height || height <= maxHeight)) && (maxWidth && (!width || width <= maxWidth)), overflow: alwaysScrollable || overflow || (maxHeight && height && height > maxHeight) || (maxWidth && width && width > maxWidth), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseover=\"mouseover()\" ng-mouseout=\"mouseout()\"><div class=\"vis-tooltip\" ng-show=\"tooltipActive\"><table><tr ng-repeat=\"p in data\"><td class=\"key\">{{p[0]}}</td><td class=\"value\"><b>{{p[1]}}</b></td></tr></table></div></div>");
$templateCache.put("components/vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\"><field-info ng-repeat=\"fieldDef in fieldSet\" ng-if=\"fieldSet && (fieldDef.field || fieldDef.autoCount)\" field-def=\"fieldDef\" enum-spec-index=\"chart.enumSpecIndex\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(fieldDef.field)), unselected: isSelected && !isSelected(fieldDef.field), highlighted: (highlighted||{})[fieldDef.field], \'enumerated-field\': isEnumeratedField(chart, $index), \'enumerated-channel\': isEnumeratedChannel(chart, $index) }\" ng-mouseover=\"fieldInfoMouseover(fieldDef, $index)\" ng-mouseout=\"fieldInfoMouseout(fieldDef, $index)\"></field-info></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" title=\"Toggle X-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" title=\"Toggle Y-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\" title=\"Sort\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" ng-class=\"{active: chart.vlSpec && (chart.vlSpec.transform||{}).filterInvalid}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" title=\"Swap X/Y\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" title=\"Bookmark\" ng-click=\"toggleBookmark(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a> <a ng-if=\"showSelect\" title=\"Select this encoding\" ng-click=\"selectAction()\" class=\"command select\"><i class=\"fa fa-server\"></i></a><div ng-if=\"showBookmarkAlert\" class=\"bookmark-alert\"><div>Remove bookmark?</div><small>Your notes will be lost.</small><div><a ng-click=\"removeBookmark(chart)\"><i class=\"fa fa-trash-o\"></i> remove it</a> <a ng-click=\"keepBookmark()\"><i class=\"fa fa-bookmark\"></i> keep it</a></div></div></div></div><vl-plot class=\"flex-grow-1\" chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" max-height=\"maxHeight\" max-width=\"maxWidth\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot><textarea class=\"annotation\" ng-if=\"Bookmarks.isBookmarked(chart.shorthand)\" ng-model=\"Bookmarks.dict[chart.shorthand].annotation\" ng-change=\"Bookmarks.saveAnnotations(chart.shorthand)\" placeholder=\"notes\"></textarea></div>");
$templateCache.put("components/vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-Lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', spec: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");
$templateCache.put("components/vlplotgrouplist/vlplotgrouplist.html","<div class=\"vl-plot-group-list-container\"><div class=\"vis-list-header\" ng-show=\"listTitle\"><h3>{{listTitle}}</h3><span class=\"description\"></span></div><div class=\"vis-list hflex flex-wrap\"><vl-plot-group ng-repeat=\"item in items | limitTo: limit\" ng-init=\"chart = getChart(item)\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" is-in-list=\"isInList\" enable-pills-preview=\"enablePillsPreview\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug && consts.debugInList\" show-select=\"true\" show-filter-null=\"true\" show-log=\"true\" show-sort=\"true\" overflow=\"true\" tooltip=\"true\" highlighted=\"Pills.highlighted\" select-action=\"select(chart)\" priority=\"priority + $index\"></vl-plot-group></div><a ng-click=\"increaseLimit()\"><div class=\"vis-list-more\" ng-show=\"limit < items.length\">Load more...</div></a></div>");}]);
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
      return _.filter(arr, {
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

        scope.sampleData = _.filter(Dataset.datasets, {
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

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'util', 'vl', 'cql', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, util, vl, cql, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      nominal: 0,
      ordinal: 0,
      geographic: 2,
      temporal: 3,
      quantitative: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(fieldDef) {
      if (fieldDef.aggregate==='count') return 4;
      return typeOrder[fieldDef.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(fieldDef) {
      return Dataset.fieldOrderBy.type(fieldDef) + '_' +
        (fieldDef.aggregate === 'count' ? '~' : fieldDef.field.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.field = function(fieldDef) {
      return fieldDef.field;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          updateFromData(dataset, dataset.values);
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
            data = util.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          updateFromData(dataset, data);
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

    function getFieldDefs(schema, order) {
      var fieldDefs = schema.fields().map(function(field) {
        return {
          field: field,
          type: schema.type(field),
          primitiveType: schema.primitiveType(field)
        };
      });

      fieldDefs = util.stablesort(fieldDefs, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

      fieldDefs.push({ field: '*', aggregate: vl.aggregate.AggregateOp.COUNT, type: vl.type.QUANTITATIVE});
      return fieldDefs;
    }


    function updateFromData(dataset, data) {
      Dataset.data = data;
      Dataset.currentDataset = dataset;

      Dataset.schema = cql.schema.Schema.build(data);
      // TODO: find all reference of Dataset.stats.sample and replace

      // TODO: find all reference of Dataset.dataschema and replace
      Dataset.dataschema = getFieldDefs(Dataset.schema);
    }

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
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'vg', function (Dataset, Logger, Config, _, vg) {
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
          var data = vg.util.read(scope.dataset.data, {
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
'use strict';

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
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'components/alertmessages/alertmessages.html',
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

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', function (Bookmarks, consts) {
    return {
      templateUrl: 'components/bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('channelShelf', ['ANY', 'Dataset', 'Pills', '_', 'Drop', 'Logger', 'vl', 'cql', 'Schema', function(ANY, Dataset, Pills, _, Drop, Logger, vl, cql, Schema) {
    return {
      templateUrl: 'components/channelshelf/channelshelf.html',
      restrict: 'E',
      replace: true,
      scope: {
        channelId: '=',
        encoding: '=',
        mark: '=',
        preview: '=',
        disabled: '='
      },
      link: function(scope, element /*, attrs*/) {
        var propsPopup, funcsPopup;

        // TODO(https://github.com/vega/vega-lite-ui/issues/187):
        // consider if we can use validator / cql instead
        scope.allowedCasting = {
          quantitative: [vl.type.QUANTITATIVE, vl.type.ORDINAL, vl.type.NOMINAL],
          ordinal: [vl.type.ORDINAL, vl.type.NOMINAL],
          nominal: [vl.type.NOMINAL, vl.type.ORDINAL],
          temporal: [vl.type.TEMPORAL, vl.type.ORDINAL, vl.type.NOMINAL]
        };

        scope.Dataset = Dataset;
        scope.schema = Schema.getChannelSchema(scope.channelId);
        scope.pills = Pills.pills;

        scope.isHighlighted = function (channelId) {
          var highlighted = Pills.highlighted || {};
          return highlighted[scope.encoding[channelId].field] ||
            highlighted['f' + channelId];
        };

        // These will get updated in the watcher
        scope.isAnyChannel = false;
        scope.isAnyField = false;

        scope.supportMark = function(channelId, mark) {
          if (Pills.isAnyChannel(channelId)) {
            return true;
          }
          if (mark === ANY) { // TODO: support {enum: [...]}
            return true;
          }
          return vl.channel.supportMark(channelId, mark);
        };

        propsPopup = new Drop({
          content: element.find('.shelf-properties')[0],
          target: element.find('.shelf-label')[0],
          position: 'bottom left',
          openOn: 'click'
        });

        scope.fieldInfoPopupContent =  element.find('.shelf-functions')[0];

        scope.removeField = function() {
          Pills.remove(scope.channelId);
        };

        scope.fieldDragStart = function() {
          Pills.dragStart(Pills.get(scope.channelId), scope.channelId);
        };

        scope.fieldDragStop = function() {
          Pills.dragStop();
        };

        /**
         * Event handler for dropping pill.
         */
        scope.fieldDropped = function() {
          var pill = Pills.get(scope.channelId);
          if (funcsPopup) {
            funcsPopup = null;
          }

          // validate type
          var types = Schema.schema.definitions.Type.enum;
          if (!_.includes(types, pill.type) && !cql.enumSpec.isEnumSpec(pill.type)) {
            // if existing type is not supported
            pill.type = types[0];
          }

          // TODO validate timeUnit / aggregate

          Pills.dragDrop(scope.channelId);
          Logger.logInteraction(Logger.actions.FIELD_DROP, pill);
        };

        scope.$watch('channelId', function(channelId) {
          scope.isAnyChannel = Pills.isAnyChannel(channelId);
        }, true);

        // FIXME: remove this confusing 2-way binding logics
        // If some external action changes the fieldDef, we also need to update the pill
        scope.$watch('encoding[channelId]', function(fieldDef) {
          // Preview shelf should not cause side effect
          if (scope.preview) {
            scope.isEnumeratedField = Pills.isEnumeratedField(scope.channelId);
            scope.isEnumeratedChannel = Pills.isEnumeratedChannel(scope.channelId);
          } else {
            Pills.set(scope.channelId, fieldDef ? _.cloneDeep(fieldDef) : {});
            scope.isAnyField = cql.enumSpec.isEnumSpec(fieldDef.field);
          }
        }, true);

        scope.$watchGroup(['allowedCasting[Dataset.schema.type(encoding[channelId].field)]', 'encoding[channel].aggregate'], function(arr){
          var allowedTypes = arr[0], aggregate=arr[1];
          scope.allowedTypes = aggregate === 'count' ? [vl.type.QUANTITATIVE] : allowedTypes;
        });
      }
    };
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
  .directive('fieldInfo', ['ANY', 'Dataset', 'Drop', 'vl', 'cql', 'consts', '_', function (ANY, Dataset, Drop, vl, cql, consts, _) {
    return {
      templateUrl: 'components/fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        fieldDef: '=',
        showAdd: '=',
        showCaret: '=',
        showInfo: '=',
        showRemove: '=',
        showType: '=',
        popupContent: '=',

        action: '&',
        addAction: '&',
        removeAction: '&',
        disableCountCaret: '=',
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.vlType = vl.type;
        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        // Properties that are created by a watcher later
        scope.typeName = null;
        scope.icon = null;
        scope.null = null;

        scope.containsType = function(types, type) {
          return _.includes(types, type);
        };

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(fieldDef) {
          return fieldDef.aggregate || fieldDef.timeUnit ||
            (fieldDef.bin && 'bin') ||
            fieldDef._aggregate || fieldDef._timeUnit ||
            (fieldDef._bin && 'bin') || (fieldDef._any && 'auto');
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

        var TYPE_NAMES = {
          nominal: 'text',
          ordinal: 'text-ordinal',
          quantitative: 'number',
          temporal: 'time',
          geographic: 'geo'
        };

        var TYPE_ICONS = {
          nominal: 'fa-font',
          ordinal: 'fa-font',
          quantitative: 'icon-hash',
          temporal: 'fa-calendar',
        };
        TYPE_ICONS[ANY] = 'fa-asterisk'; // separate line because we might change what's the string for ANY

        function getTypeDictValue(type, dict) {
          if (cql.enumSpec.isEnumSpec(type)) { // is enumSpec
            var val = null;
            for (var i = 0; i < type.enum.length; i++) {
              var _type = type.enum[i];
              if (val === null) {
                val = dict[_type];
              } else {
                if (val !== dict[_type]) {
                  return ANY; // If there are many conflicting types
                }
              }
            }
            return val;
          }
          return dict[type];
        }

        scope.$watch('fieldDef', function(fieldDef) {
          scope.icon = getTypeDictValue(fieldDef.type, TYPE_ICONS);
          scope.typeName = getTypeDictValue(fieldDef.type, TYPE_NAMES);
          if (fieldDef.field && Dataset.schema) { // only calculate stats if we have field attached and have schema ready
            scope.stats = Dataset.schema.stats(fieldDef);
          }
        });

        scope.$on('$destroy', function() {
          if (funcsPopup && funcsPopup.destroy) {
            funcsPopup.destroy();
          }
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('functionSelect', ['_', 'consts', 'vl', 'Pills', 'Logger', 'Dataset', function(_, consts, vl, Pills, Logger, Dataset) {
    return {
      templateUrl: 'components/functionselect/functionselect.html',
      restrict: 'E',
      scope: {
        channelId: '=',
        fieldDef: '='
      },
      link: function(scope /*,element, attrs*/) {
        var BIN='bin', COUNT='count', maxbins;

        scope.func = {
          selected: undefined,
          list: {
            aboveFold: [],
            belowFold: [] // could be empty
          },
          isTemporal: false, // for making belowFold timeUnits single-column
          isCount: false // hide "more" & "less" toggle for COUNT
        };

        // functions for T = timeUnits + undefined
        var temporalFunctions = {
          aboveFold: [
            undefined, 'year',
            'quarter', 'month',
            'date','day',
            'hours', 'minutes',
            'seconds', 'milliseconds',
            'yearmonthdate'
          ],
          belowFold: [
            'yearquarter',
            'yearmonth',
            'yearmonthdatehours',
            'yearmonthdatehoursminutes',
            'yearmonthdatehoursminutesseconds',
            'hoursminutes',
            'hoursminutesseconds',
            'minutesseconds',
            'secondsmilliseconds'
          ]
        };

        // timeUnits = T functions - undefined
        var timeUnits = _.pull(_.concat(temporalFunctions.aboveFold, temporalFunctions.belowFold), undefined);

        // functions for Q = aggregates + BIN + undefined - COUNT
        var quantitativeFunctions = {
          aboveFold: [
            undefined, 'bin',
            'min', 'max',
            'mean', 'median',
            'sum'
          ],
          belowFold: [
            'valid', 'missing',
            'distinct', 'modeskew',
            'q1', 'q3',
            'stdev', 'stdevp',
            'variance', 'variancep'
          ] // hide COUNT for Q in the UI because we dedicate it to a special "# Count" field
        };

        // aggregates = Q Functions + COUNT - BIN - undefined
        var aggregates = _.pull(_.concat(quantitativeFunctions.aboveFold, quantitativeFunctions.belowFold, [COUNT]),
          BIN, undefined);

        scope.selectChanged = function() {
          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.selected);

          var selectedFunc = scope.func.selected;

          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            type = pill ? pill.type : '',
            isQ = type === vl.type.QUANTITATIVE,
            isT = type === vl.type.TEMPORAL;

          if(!pill){
            return; // not ready
          }

          // reset field def
          // HACK: we're temporarily storing the maxbins in the pill
          pill.bin = selectedFunc === BIN ? {} : undefined;
          pill.aggregate = (isQ && aggregates.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;
          pill.timeUnit = (isT && timeUnits.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        // when parent objects modify the field
        scope.$watch('fieldDef', function(pill) {
          if (!pill) {
            return;
          }

          var type = pill.field ? pill.type : '';

          // hack: save the maxbins
          if (pill.bin) {
            maxbins = pill.bin.maxbins;
          }

          var isOrdinalShelf = ['row','column','shape'].indexOf(scope.channelId) !== -1,
            isQ = type === vl.type.QUANTITATIVE,
            isT = type === vl.type.TEMPORAL;

          // for making belowFold timeUnits single-column
          scope.func.isTemporal = isT;

          // hide "more" & "less" toggles for COUNT
          scope.func.isCount = pill.field === '*';

          if(pill.field === '*' && pill.aggregate === COUNT){
            scope.func.list.aboveFold=[COUNT];
            scope.func.list.belowFold=[];
            scope.func.selected = COUNT;
          } else {
            // TODO: check supported type based on primitive data?
            function cardinalityFilter(timeUnit) {
              // Convert 'any' channel to '?'.
              var channel = Pills.isAnyChannel(scope.channelId) ? '?' : scope.channelId;
              return !timeUnit || // Don't filter undefined.
                // Remove timeUnits that have cardinality <= 1. 
                Dataset.schema.cardinality({field: pill.field, channel: channel, timeUnit: timeUnit}, true, true) > 1;
            }
            if (isT) {
              scope.func.list.aboveFold = temporalFunctions.aboveFold.filter(cardinalityFilter);
              scope.func.list.belowFold = temporalFunctions.belowFold.filter(cardinalityFilter);
            }
            else if (isQ) {
              scope.func.list.aboveFold = quantitativeFunctions.aboveFold;
              scope.func.list.belowFold = quantitativeFunctions.belowFold;
            }

            var defaultVal = (isOrdinalShelf &&
              (isQ && BIN) || (isT && consts.defaultTimeFn)
            ) || undefined;

            var selected = pill.bin ? 'bin' :
              pill.aggregate || pill.timeUnit;

            if (scope.func.list.aboveFold.indexOf(selected) >= 0 || scope.func.list.belowFold.indexOf(selected) >= 0) {
              scope.func.selected = selected;
            } else {
              scope.func.selected = defaultVal;
            }
          }
        }, true);
      }
    };
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
      templateUrl: 'components/modal/modal.html',
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
      templateUrl: 'components/modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        closeAction: '&'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeAction) {
            scope.closeAction();
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
 * @name vega-lite-ui.directive:propertyEditor
 * @description
 * # propertyEditor
 */
angular.module('vlui')
  .directive('propertyEditor', function () {
    return {
      templateUrl: 'components/propertyeditor/propertyeditor.html',
      restrict: 'E',
      scope: {
        id: '=',
        type: '=',
        enum: '=',
        propName: '=',
        group: '=',
        description: '=',
        default: '=',
        min: '=',
        max: '=',
        role: '=' // for example 'color'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.hasAuto = scope.default === undefined;

        //TODO(kanitw): consider renaming
        scope.automodel = { value: false };

        if (scope.hasAuto) {
          scope.automodel.value = scope.group[scope.propName] === undefined;

          // change the value to undefined if auto is true
          scope.$watch('automodel.value', function() {
            if (scope.automodel.value === true) {
              scope.group[scope.propName] = undefined;
            }
          });
        }

        scope.isRange = scope.max !== undefined && scope.min !== undefined;
      }
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('schemaList', function() {
    return {
      templateUrl: 'components/schemalist/schemalist.html',
      restrict: 'E',
      scope: {
        orderBy: '=',
        fieldDefs: '=',
        showAdd: '='
      },
      replace: true
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name polestar.directive:schemaListItem
 * @description
 * # schemaListItem
 */
angular.module('vlui')
  .directive('schemaListItem', ['Pills', 'cql', function (Pills, cql) {
    return {
      templateUrl: 'components/schemalist/schemalistitem.html',
      restrict: 'E',
      replace: false,
      scope: {
        fieldDef: '=',
        showAdd:  '=',
      },
      link: function postLink(scope) {
        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.fieldAdd = function(fieldDef) {
          Pills.add(fieldDef);
        };

        scope.fieldDragStart = function() {
          var fieldDef = scope.fieldDef;

          scope.pill = {
            field: fieldDef.field,
            title: fieldDef.title,
            type: fieldDef.type,
            aggregate: fieldDef.aggregate
          };
          Pills.dragStart(scope.pill, null);
        };

        scope.fieldDragStop = Pills.dragStop;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('shelves', function() {

    return {
      templateUrl: 'components/shelves/shelves.html',
      restrict: 'E',
      scope: {
        spec: '=',
        preview: '=',
        supportAny: '='
      },
      replace: true,
      controller: ['$scope', 'ANY', 'util', 'vl', 'Config', 'Dataset', 'Logger', 'Pills', function($scope, ANY, util, vl, Config, Dataset, Logger, Pills) {
        $scope.ANY = ANY;
        $scope.anyChannelIds = [];

        $scope.marks = ['point', 'tick', 'bar', 'line', 'area', 'text'];
        $scope.marksWithAny = [ANY].concat($scope.marks);

        $scope.markChange = function() {
          Logger.logInteraction(Logger.actions.MARK_CHANGE, $scope.spec.mark);
        };

        $scope.transpose = function(){
          vl.spec.transpose($scope.spec);
        };

        $scope.clear = function(){
          Logger.logInteraction(Logger.actions.SPEC_CLEAN, null);
          Pills.reset();
        };

        $scope.$watch('spec', function(spec) {
          // populate anyChannelIds so we show all or them
          if ($scope.supportAny) {
            $scope.anyChannelIds = util.keys(spec.encoding).reduce(function(anyChannelIds, channelId) {
              if (Pills.isAnyChannel(channelId)) {
                anyChannelIds.push(channelId);
              }
              return anyChannelIds;
            }, []);
          }
          // Only call Pills.update, which will trigger Spec.spec to update if it's not a preview.
          if (!$scope.preview) {
            Logger.logInteraction(Logger.actions.SPEC_CHANGE, spec);
            Pills.update(spec);
          }
        }, true); //, true /* watch equality rather than reference */);
      }]
    };
  });
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
      templateUrl: 'components/tabs/tab.html',
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
      templateUrl: 'components/tabs/tabset.html',
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
  .directive('vlPlot', ['vl', 'vg', 'cql', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(vl, vg, cql, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return a.priority - b.priority;
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
      templateUrl: 'components/vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '=',
        /** A function that returns if the plot is still in the view, so it might be omitted from the render queue if necessary. */
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

        var format = vg.util.format.number('');

        scope.mouseover = function() {
          scope.hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, scope.chart.shorthand);
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseout = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, scope.chart.shorthand);
          }

          $timeout.cancel(scope.hoverPromise);
          scope.hoverFocus = scope.unlocked = false;
        };

        function viewOnMouseOver(event, item) {
          if (!item || !item.datum) {
            return;
          }

          scope.tooltipPromise = $timeout(function activateTooltip(){

            // avoid showing tooltip for facet's background
            if (item.datum._facetID) {
              return;
            }

            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum, {
              shorthand: scope.chart.shorthand
            });

            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _(item.datum).omit('_prev', '_id') // omit vega internals
              .toPairs().value()
              .map(function(p) {
                p[1] = vg.util.isNumber(p[1]) ? format(p[1]) : p[1];
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
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum, {
              shorthand: scope.chart.shorthand
            });
          }
          scope.tooltipActive = false;
          scope.data = [];
          scope.$digest();
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) {
            return;
          }

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vg.util.extend(vlSpec.config, Config[configSet]());
          return vl.compile(vlSpec).spec;
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
          return scope.chart.shorthand || (scope.chart.vlSpec ? cql.query.shorthand.vlSpec(scope.chart.vlSpec) : '');
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

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(error, chart) {
              if (error) {
                console.error('error', error);
                $timeout(renderQueueNext, 1);
                return;
              }
              try {
                var endParse = new Date().getTime();
                view = null;
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                view.update();
                // read width / height from layout
                var layout = view.data('layout').values()[0];
                var renderer = getRenderer(layout.width, layout.height);
                if (renderer === 'svg') {
                  view.renderer(renderer);
                }

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, scope.chart.shorthand);
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  view.on('mouseover', viewOnMouseOver);
                  view.on('mouseout', viewOnMouseOut);
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                $timeout(renderQueueNext, 1);
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
            // FIXME
            scope.chart.cleanSpec = scope.chart.vlSpec;
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
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'vg', 'vl', 'Dataset', 'Logger', '_', 'Pills', 'Chart', '$timeout', function (Bookmarks, consts, vg, vl, Dataset, Logger, _, Pills, Chart, $timeout) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgroup.html',
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
        enablePillsPreview: '=',
        maxHeight: '=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',

        /* vlplotgroup specific */

        /** Set of fieldDefs for showing field info.  For Voyager2, this might be just a subset of fields that are ambiguous. */
        fieldSet: '=',

        showBookmark: '@',
        showDebug: '=',
        showExpand: '=',
        showFilterNull: '@',
        showLabel: '@',
        showLog: '@',
        showSelect: '@',
        showSort: '@',
        showTranspose: '@',

        /** Whether the log / transpose sort cause side effect to the shelf  */
        toggleShelf: '=',

        alwaysSelected: '=',
        isSelected: '=',
        highlighted: '=',
        expandAction: '&',
        selectAction: '&'
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.hovered = false;

        // bookmark alert
        scope.showBookmarkAlert = false;
        scope.toggleBookmark = function(chart) {
          if (Bookmarks.isBookmarked(chart.shorthand)) {
            scope.showBookmarkAlert = !scope.showBookmarkAlert; // toggle alert
          }
          else {
            Bookmarks.add(chart);
          }
        };

        var hoverPromise = null;

        scope.fieldInfoMouseover = function(fieldDef, index) {
          scope.hovered = true;

          hoverPromise = $timeout(function() {
            (scope.highlighted||{})[fieldDef.field] = true;

            // Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                (scope.highlighted||{})[fieldEnumSpecName] = true;
              }
            }

            Logger.logInteraction(Logger.actions.FIELDDEF_HIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field
            });

            if (scope.enablePillsPreview) {
              Pills.preview(scope.chart.vlSpec);
            }
          }, 500);
        };

        scope.fieldInfoMouseout = function(fieldDef, index) {
          scope.hovered = false;

          if (hoverPromise) {
            // if we unhover within
            $timeout.cancel(hoverPromise);
          }
          hoverPromise = null;

          if ((scope.highlighted||{})[fieldDef.field]) {
            // disable preview if it's enabled
            Logger.logInteraction(Logger.actions.FIELDDEF_UNHIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field
            });

            (scope.highlighted||{})[fieldDef.field] = false;

            // Unlink Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                delete (scope.highlighted||{})[fieldEnumSpecName];
              }
            }

            if (scope.enablePillsPreview) {
              Pills.preview(null);
            }
          }
        };

        scope.isEnumeratedField = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].field;
            }
          }
          return false;
        };

        scope.isEnumeratedChannel = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].channel;
            }
          }
          return false;
        };

        scope.removeBookmark = function(chart) {
          Bookmarks.remove(chart);
          scope.showBookmarkAlert = false;
        };

        scope.keepBookmark = function() {
          scope.showBookmarkAlert = false;
        };

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
        scope.log.support = function(spec, channel) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            fieldDef = encoding[channel];

          return fieldDef && fieldDef.type === vl.type.QUANTITATIVE && !fieldDef.bin;
        };

        scope.log.toggle = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          if (scope.toggleShelf) {
            Pills.rescale(channel, scale.type === 'log' ? 'linear' : 'log');
          } else {
            scale.type = scale.type === 'log' ? 'linear' : 'log';
          }

          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand);
        };

        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale;

          return scale && scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          spec.transform = spec.transform || {};
          spec.transform.filterInvalid = spec.transform.filterInvalid === true ? undefined : true;
        };

        scope.toggleFilterNull.support = function(spec) {
          var fieldDefs = vl.spec.fieldDefs(spec);
          for (var i in fieldDefs) {
            var fieldDef = fieldDefs[i];
            if (_.includes([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) && Dataset.schema.stats(fieldDef).missing > 0) {
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

          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand, {
            currentMode: currentMode,
            newMode: newMode
          });

          var channels = toggleSort.channels(spec);

          if (scope.toggleShelf) {
            Pills.setSort(channels.ordinal, toggleSort.getSort(newMode, spec));
          } else {
            spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
          }
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
              field: qEncDef.field,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
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

          if (vg.util.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === vl.type.NOMINAL || spec.encoding.x.type === vl.type.ORDINAL ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.encoding.isAggregate(spec.encoding)) { // FIXME replace this proper alwaysNoOcclusion method
            return false;
          }

          return (
              (encoding.x.type === vl.type.NOMINAL || encoding.x.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.y)
            ) ? 'x' :
            (
              (encoding.y.type === vl.type.NOMINAL || encoding.y.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.x)
            ) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec)) {
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
          if (scope.toggleShelf) {
            Pills.transpose();
          } else {
            Chart.transpose(scope.chart.vlSpec);
          }
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
      templateUrl: 'components/vlplotgroup/vlplotgrouppopup.html',
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
  .directive('vlPlotGroupList', ['vl', 'cql', 'jQuery', 'consts', '_', 'Logger', 'Pills', 'Chart', function (vl, cql, jQuery, consts, _, Logger, Pills, Chart) {
    return {
      templateUrl: 'components/vlplotgrouplist/vlplotgrouplist.html',
      restrict: 'E',
      replace: true,
      scope: {
        /** An instance of specQueryModelGroup */
        enablePillsPreview: '=',
        initialLimit: '=',
        listTitle: '=',
        items: '=',
        priority: '=',
        showMore: '=',
        postSelectAction: '&'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.consts = consts;
        scope.limit = scope.initialLimit || 3;

        // Functions
        scope.getChart = Chart.getChart;
        scope.increaseLimit = increaseLimit;
        scope.isInlist = isInList;
        scope.select = select;
        scope.Pills = Pills;

        // element.bind('scroll', function(){
        //    if(jQuery(this).scrollTop() + jQuery(this).innerHeight() >= jQuery(this)[0].scrollHeight){
        //     if (scope.limit < scope.modelGroup.items.length) {
        //       scope.increaseLimit();
        //     }
        //    }
        // });

        function increaseLimit() {
          scope.limit += 5;
          Logger.logInteraction(Logger.actions.LOAD_MORE, scope.limit, {
            list: scope.listTitle
          });
        }

        /** return if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        function isInList(chart) {
          for (var i = 0; i < scope.items.length; i++) {
            if(chart.specM === scope.items[i].getTopSpecQueryModel()) {
              return true;
            }
          }
          return false;
        }

        function select(chart) {
          Logger.logInteraction(Logger.actions.SPEC_SELECT, chart.shorthand, {
            list: scope.listTitle
          });
          Pills.parse(chart.vlSpec);
          if (scope.postSelectAction) {
            scope.postSelectAction();
          }
        }
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

      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1323680136=' + spec + '&';
      }

      if (params.spec2) {
        var spec2 = _.omit(params.spec2, 'config');
        spec2 = encodeURI(compactJSONFilter(spec2));
        url += 'entry.853137786=' + spec2 + '&';
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
      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1245199477=' + spec + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
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
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.list = [];
      this.dict = {};
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.save = function() {
      localStorageService.set('bookmarkList', this.list);
    };

    proto.saveAnnotations = function(shorthand) {
      _.find(this.list, function(bookmark) { return bookmark.shorthand === shorthand; })
        .chart.annotation = this.dict[shorthand].annotation;
      this.save();
    };

    // export all bookmarks and annotations
    proto.export = function() {
      var dictionary = this.dict;

      // prepare export data
      var exportSpecs = [];
      _.forEach(this.list, function(bookmark) {
        var spec = bookmark.chart.vlSpec;
        spec.description = dictionary[bookmark.shorthand].annotation;
        exportSpecs.push(spec);
      });

      // write export data in a new tab
      var exportWindow = window.open();
      exportWindow.document.open();
      exportWindow.document.write('<html><body><pre>' + JSON.stringify(exportSpecs, null, 2) + '</pre></body></html>');
      exportWindow.document.close();
    };

    proto.load = function() {
      this.list = localStorageService.get('bookmarkList') || [];

      // populate this.dict
      var dictionary = this.dict;
      _.forEach(this.list, function(bookmark) {
        dictionary[bookmark.shorthand] = _.cloneDeep(bookmark.chart);
      });
    };

    proto.clear = function() {
      this.list.splice(0, this.list.length);
      this.dict = {};
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.add = function(chart) {
      var shorthand = chart.shorthand;

      console.log('adding', chart.vlSpec, shorthand);

      chart.timeAdded = (new Date().getTime());

      // FIXME: this is not always a good idea
      chart.schema = Dataset.schema;

      this.dict[chart.shorthand] = _.cloneDeep(chart);

      this.list.push({shorthand: shorthand, chart: _.cloneDeep(chart)});

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      // remove bookmark from this.list
      var index = this.list.findIndex(function(bookmark) { return bookmark.shorthand === shorthand; });
      if (index >= 0) {
        this.list.splice(index, 1);
      }

      // remove bookmark from this.dict
      delete this.dict[chart.shorthand];

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.reorder = function() {
      this.save();
    };

    proto.isBookmarked = function(shorthand) {
      return this.dict.hasOwnProperty(shorthand);
    };

    proto.logBookmarksClosed = function() {
      Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Chart', ['cql', '_', function (cql, _) {
    var Chart = {
      getChart: getChart,
      transpose: transpose
    };

    /**
     *
     * @param {SpecQueryModelGroup | SpecQueryModel} item
     */
    function getChart(item) {
      if (!item) {
        return {
          /** @type {Object} concise spec generated */
          vlSpec: null,
          fieldSet: null,

          /** @type {String} generated vl shorthand */
          shorthand: null,
          enumSpecIndex: null
        };
      }

      var specM = item instanceof cql.model.SpecQueryModelGroup ?
        item.getTopSpecQueryModel():
        item;
      return {
        enumSpecIndex: specM.enumSpecIndex,
        fieldSet: specM.specQuery.encodings,
        vlSpec: specM.toSpec(),
        shorthand: specM.toShorthand(),
        specM: specM
      };
    }

    function transpose(spec) {
      var encoding = _.clone(spec.encoding);
      var oldXEnc = encoding.x;
      var oldYEnc = encoding.y;
      encoding.y = oldXEnc;
      encoding.x = oldYEnc;

      var oldRowEnc = encoding.row;
      var oldColEnc = encoding.column;
      encoding.row = oldColEnc;
      encoding.column = oldRowEnc;

      spec.encoding = encoding;
    }

    return Chart;
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', function() {
    var Config = {};

    Config.data = {};
    Config.config = {};

    Config.getConfig = function() {
      return {};
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        cell: {
          width: 400,
          height: 400
        },
        facet: {
          cell: {
            width: 200,
            height: 200
          }
        }
      };
    };

    Config.small = function() {
      return {
        facet: {
          cell: {
            width: 150,
            height: 150
          }
        }
      };
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
  });
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
  .service('Logger', ['$location', '$window', '$webSql', '_', 'consts', 'Analytics', 'Papa', 'Blob', 'URL', function ($location, $window, $webSql, _, consts, Analytics, Papa, Blob, URL) {

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
      MARK_TOGGLE: {category: 'CHART', id:'MARK_TOGGLE', level: service.levels.INFO},
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
      ADD_FIELD: {category: 'FIELDS', id: 'ADD_FIELD', level: service.levels.INFO},

      // Field Info
      FIELDDEF_HIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_HIGHLIGHTED', level: service.levels.INFO},
      FIELDDEF_UNHIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_UNHIGHLIGHTED', level: service.levels.INFO},

      //POLESTAR
      SPEC_CLEAN: {category:'POLESTAR', id: 'SPEC_CLEAN', level: service.levels.INFO},
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.INFO},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.INFO},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.INFO},

      // Voyager 2
      SPEC_SELECT: {category:'VOYAGER2', id: 'SPEC_SELECT', level: service.levels.INFO},

      // Alternatives
      SET_ALTERNATIVES_TYPE: {category:'ALTERNATIVES', id: 'SET_ALTERNATIVES_TYPE', level: service.levels.INFO},
      TOGGLE_SHOW_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_SHOW_ALTERNATIVES', level: service.levels.INFO},
      TOGGLE_HIDE_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_HIDE_ALTERNATIVES', level: service.levels.INFO},

      // Preview
      SPEC_PREVIEW_ENABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_ENABLED', level: service.levels.INFO},
      SPEC_PREVIEW_DISABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_DISABLED', level: service.levels.INFO}
    };

    // create noop service if websql is not supported
    if ($window.openDatabase === undefined) {
      console.warn('No websql support and thus no logging.');
      service.logInteraction = function() {};
      return service;
    }

    // get user id once in the beginning
    var userid = service.userid = $location.search().userid;

    service.db = $webSql.openDatabase('logs', '1.0', 'Logs', 2 * 1024 * 1024);

    service.tableName = 'Logs_' + consts.appId;

    // (zening) TODO: check if the table is correct, do we really need time? will time be automatically added?
    service.createTableIfNotExists = function() {
      service.db.createTable(service.tableName, {
        'userid': {
          'type': 'INTEGER',
          'null': 'NOT NULL'
        },
        'time': {
          'type': 'TIMESTAMP',
          'null': 'NOT NULL'
        },
        'actionCategory': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'actionId': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'label': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'data': {
          'type': 'TEXT'
        }
      });
    };

    service.clear = function() {
      var r = $window.confirm('Really clear the logs?');
      if (r === true) {
        service.db.dropTable(service.tableName);
        service.createTableIfNotExists();
      }
    };

    service.export = function() {
      service.db.selectAll(service.tableName).then(function(results) {
        if (results.rows.length === 0) {
          console.warn('No logs');
          return;
        }

        var rows = [];

        for(var i=0; i < results.rows.length; i++) {
          rows.push(results.rows.item(i));
        }

        var csv = Papa.unparse(rows);

        var csvData = new Blob([csv], { type: 'text/csv' });
        var csvUrl = URL.createObjectURL(csvData);

        var element = angular.element('<a/>');
        element.attr({
          href: csvUrl,
          target: '_blank',
          download: service.tableName + '_' + userid + '_' + new Date().toISOString() + '.csv'
        })[0].click();
      });
    };


    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels[consts.logLevel || 'INFO'].rank) {
        Analytics.trackEvent(action.category, action.id, label, value);

        if (consts.logToWebSql) {
          var row = {
            userid: userid,
            time: new Date().toISOString(),
            actionCategory: action.category,
            actionId: action.id,
            label: _.isObject(label) ? JSON.stringify(label) : label,
            data: data ? JSON.stringify(data) : undefined
          };
          service.db.insert(service.tableName, row);
        }

        console.log('[Logging] ', action.id, label, data);
      }
    };

    service.createTableIfNotExists();
    console.log('app:', consts.appId, 'started');
    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Pills', ['ANY', 'util', function (ANY, util) {
    var Pills = {
      // Functions
      isAnyChannel: isAnyChannel,
      getNextAnyChannelId: getNextAnyChannelId,
      getEmptyAnyChannelId: getEmptyAnyChannelId,
      isEnumeratedChannel: isEnumeratedChannel,
      isEnumeratedField: isEnumeratedField,

      get: get,
      // Event
      dragStart: dragStart,
      dragStop: dragStop,
      // Event, with handler in the listener

      /** Set a fieldDef for a channel */
      set: set,

      /** Remove a fieldDef from a channel */
      remove: remove,

      /** Add new field to the pills */
      add: add,

      /** Pass message to toggler listeners */
      rescale: rescale,
      sort: sort,
      transpose: transpose,

      /** Parse a new spec */
      parse: parse,

      /** Preview a spec */
      preview: preview,

      /** If the spec/query gets updated */
      update: update,

      reset: reset,
      dragDrop: dragDrop,

      // Data
      // TODO: split between encoding related and non-encoding related
      pills: {},
      highlighted: {},
      /** pill being dragged */
      dragging: null,
      /** channelId that's the pill is being dragged from */
      cidDragFrom: null,
      /** Listener  */
      listener: null
    };

    /**
     * Returns whether the given channel id is an "any" channel
     *
     * @param {any} channelId
     */
    function isAnyChannel(channelId) {
      return channelId && channelId.indexOf(ANY) === 0; // prefix by ANY
    }

    function getEmptyAnyChannelId() {
      var anyChannels = util.keys(Pills.pills).filter(function(channelId) {
        return channelId.indexOf(ANY) === 0;
      });
      for (var i=0 ; i < anyChannels.length; i++) {
        var channelId = anyChannels[i];
        if (!Pills.pills[channelId].field) {
          return channelId;
        }
      }
      throw new Error('No empty any channel available!');
    }

    function getNextAnyChannelId() {
      var i = 0;
      while (Pills.pills[ANY + i]) {
        i++;
      }
      return ANY + i;
    }

    /**
     * Set a fieldDef of a pill of a given channelId
     * @param channelId channel id of the pill to be updated
     * @param fieldDef fieldDef to to be updated
     * @param update whether to propagate change to the channel update listener
     */
    function set(channelId, fieldDef, update) {
      Pills.pills[channelId] = fieldDef;

      if (update && Pills.listener) {
        Pills.listener.set(channelId, fieldDef);
      }
    }

    /**
     * Get a fieldDef of a pill of a given channelId
     */
    function get(channelId) {
      return Pills.pills[channelId];
    }

    function add(fieldDef) {
      if (Pills.listener && Pills.listener.add) {
        Pills.listener.add(fieldDef);
      }
    }

    function isEnumeratedChannel(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedChannel) {
        return Pills.listener.isEnumeratedChannel(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function isEnumeratedField(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedField) {
        return Pills.listener.isEnumeratedField(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function remove(channelId) {
      delete Pills.pills[channelId];
      if (Pills.listener) {
        Pills.listener.remove(channelId);
      }
    }

    function sort(channelId, sort) {
      if (Pills.listener && Pills.listener.sort) {
        Pills.listener.sort(channelId, sort);
      }
    }

    function rescale(channelId, scaleType) {
      if (Pills.listener && Pills.listener.rescale) {
        Pills.listener.rescale(channelId, scaleType);
      }
    }

    function transpose() {
      if (Pills.listener && Pills.listener.transpose) {
        Pills.listener.transpose();
      }
    }

    /**
     * Re-parse the spec.
     *
     * @param {any} spec
     */
    function parse(spec) {
      if (Pills.listener) {
        Pills.listener.parse(spec);
      }
    }

    /**
     * Add Spec to be previewed (for Voyager2)
     *
     * @param {any} spec
     */
    function preview(spec) {
      if (Pills.listener) {
        Pills.listener.preview(spec);
      }
    }

    /**
     * Update the whole pill set
     *
     * @param {any} spec
     */
    function update(spec) {
      if (Pills.listener) {
        Pills.listener.update(spec);
      }
    }


    /** Reset Pills */
    function reset() {
      if (Pills.listener) {
        Pills.listener.reset();
      }
    }

    /**
     * @param {any} pill pill being dragged
     * @param {any} cidDragFrom channel id that the pill is dragged from
     */
    function dragStart(pill, cidDragFrom) {
      Pills.dragging = pill;
      Pills.cidDragFrom = cidDragFrom;
    }

    /** Stop pill dragging */
    function dragStop() {
      Pills.dragging = null;
    }

    /**
     * When a pill is dropped
     * @param cidDragTo  channelId that's the pill is being dragged to
     */
    function dragDrop(cidDragTo) {
      if (Pills.listener) {
        Pills.listener.dragDrop(cidDragTo, Pills.cidDragFrom);
      }
    }

    return Pills;
  }]);
}());

;(function() {
'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', ['vg', 'vl', 'vlSchema', function(vg, vl, vlSchema) {
    var Schema = {};

    Schema.schema = vlSchema;

    Schema.getChannelSchema = function(channel) {
      var def = null;
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      // for detail, just get the flat version
      var ref = encodingChannelProp ?
        (encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref) :
        'FieldDef'; // just use the generic version for ANY channel
      def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  }]);
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJ2bC1zY2hlbWEuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuanMiLCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuanMiLCJkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuanMiLCJkYXRhc2V0L2RhdGFzZXQuc2VydmljZS5qcyIsImRhdGFzZXQvZGF0YXNldG1vZGFsLmpzIiwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuanMiLCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5qcyIsImRhdGFzZXQvcGFzdGVkYXRhc2V0LmpzIiwiZGF0YXNldC9zYW1wbGVkYXRhLmpzIiwiY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuanMiLCJjb21wb25lbnRzL2Jvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuanMiLCJjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuanMiLCJjb21wb25lbnRzL2ZpZWxkaW5mby9maWVsZGluZm8uanMiLCJjb21wb25lbnRzL2Z1bmN0aW9uc2VsZWN0L2Z1bmN0aW9uc2VsZWN0LmpzIiwiY29tcG9uZW50cy9tb2RhbC9tb2RhbC5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxzLnNlcnZpY2UuanMiLCJjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmpzIiwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3QuanMiLCJjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdGl0ZW0uanMiLCJjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5qcyIsImNvbXBvbmVudHMvdGFicy90YWIuanMiLCJjb21wb25lbnRzL3RhYnMvdGFic2V0LmpzIiwiY29tcG9uZW50cy92bHBsb3QvdmxwbG90LmpzIiwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5qcyIsImZpbHRlcnMvY29tcGFjdGpzb24vY29tcGFjdGpzb24uZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyIsImZpbHRlcnMvcmVwb3J0dXJsL3JlcG9ydHVybC5maWx0ZXIuanMiLCJmaWx0ZXJzL3VuZGVyc2NvcmUyc3BhY2UvdW5kZXJzY29yZTJzcGFjZS5maWx0ZXIuanMiLCJzZXJ2aWNlcy9hbGVydHMvYWxlcnRzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9ib29rbWFya3MvYm9va21hcmtzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9jaGFydC9jaGFydC5zZXJ2aWNlLmpzIiwic2VydmljZXMvY29uZmlnL2NvbmZpZy5zZXJ2aWNlLmpzIiwic2VydmljZXMvbG9nZ2VyL2xvZ2dlci5zZXJ2aWNlLmpzIiwic2VydmljZXMvcGlsbHMvcGlsbHMuc2VydmljZS5qcyIsInNlcnZpY2VzL3NjaGVtYS9zY2hlbWEuc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUFLQSxDQUFDLENBQUMsWUFBWTs7O0VBR1osSUFBSSxXQUFXLE9BQU8sV0FBVyxjQUFjLE9BQU87OztFQUd0RCxJQUFJLGNBQWM7SUFDaEIsWUFBWTtJQUNaLFVBQVU7Ozs7RUFJWixJQUFJLGNBQWMsWUFBWSxPQUFPLFlBQVksV0FBVyxDQUFDLFFBQVEsWUFBWTs7Ozs7O0VBTWpGLElBQUksT0FBTyxZQUFZLE9BQU8sV0FBVyxVQUFVO01BQy9DLGFBQWEsZUFBZSxZQUFZLE9BQU8sV0FBVyxVQUFVLENBQUMsT0FBTyxZQUFZLE9BQU8sVUFBVSxZQUFZOztFQUV6SCxJQUFJLGVBQWUsV0FBVyxjQUFjLGNBQWMsV0FBVyxjQUFj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VUFBVTtRQUNsQixNQUFNLFNBQVMsT0FBTzs7Ozs7O0lBTTFCLFNBQVMsUUFBUTtNQUNmLElBQUksTUFBTSxVQUFVO1FBQ2xCLE1BQU0sU0FBUzs7Ozs7Ozs7SUFRbkIsU0FBUyxVQUFVLE1BQU0sYUFBYTtNQUNwQyxNQUFNLFdBQVc7TUFDakIsTUFBTSxjQUFjOzs7O0lBSXRCLFNBQVMsV0FBVztNQUNsQixNQUFNLFdBQVc7Ozs7Ozs7SUFPbkIsU0FBUyxTQUFTLFdBQVc7TUFDM0IsSUFBSSxNQUFNLFVBQVU7UUFDbEIsTUFBTSxTQUFTLFNBQVMsV0FBVyxNQUFNOzs7O0lBSTdDLE9BQU87O0FBRVg7OztBQzNOQTs7O0FBR0EsUUFBUSxPQUFPO0dBQ1osUUFBUSxtQ0FBVSxTQUFTLElBQUksSUFBSSxVQUFVO0lBQzVDLElBQUksU0FBUzs7SUFFYixPQUFPLFNBQVM7O0lBRWhCLE9BQU8sbUJBQW1CLFNBQVMsU0FBUztNQUMxQyxJQUFJLE1BQU07TUFDVixJQUFJLHNCQUFzQixPQUFPLE9BQU8sWUFBWSxTQUFTLFdBQVc7O01BRXhFLElBQUksTUFBTTtTQUNQLG9CQUFvQixRQUFRLG9CQUFvQixNQUFNLEdBQUc7UUFDMUQ7TUFDRixNQUFNLElBQUksTUFBTSxJQUFJLFlBQVksS0FBSztNQUNyQyxPQUFPLE9BQU8sT0FBTyxZQUFZOzs7SUFHbkMsT0FBTzs7QUFFWCIsImZpbGUiOiJ2bHVpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBKU09OMyB3aXRoIGNvbXBhY3Qgc3RyaW5naWZ5IC0tIE1vZGlmaWVkIGJ5IEthbml0IFdvbmdzdXBoYXNhd2F0LiAgIGh0dHBzOi8vZ2l0aHViLmNvbS9rYW5pdHcvanNvbjNcbiAqXG4gKiBGb3JrZWQgZnJvbSBKU09OIHYzLjMuMiB8IGh0dHBzOi8vYmVzdGllanMuZ2l0aHViLmlvL2pzb24zIHwgQ29weXJpZ2h0IDIwMTItMjAxNCwgS2l0IENhbWJyaWRnZSB8IGh0dHA6Ly9raXQubWl0LWxpY2Vuc2Uub3JnXG4gKi9cbjsoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgdGhlIGBkZWZpbmVgIGZ1bmN0aW9uIGV4cG9zZWQgYnkgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLiBUaGVcbiAgLy8gc3RyaWN0IGBkZWZpbmVgIGNoZWNrIGlzIG5lY2Vzc2FyeSBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGByLmpzYC5cbiAgdmFyIGlzTG9hZGVyID0gdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQ7XG5cbiAgLy8gQSBzZXQgb2YgdHlwZXMgdXNlZCB0byBkaXN0aW5ndWlzaCBvYmplY3RzIGZyb20gcHJpbWl0aXZlcy5cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgIFwiZnVuY3Rpb25cIjogdHJ1ZSxcbiAgICBcIm9iamVjdFwiOiB0cnVlXG4gIH07XG5cbiAgLy8gRGV0ZWN0IHRoZSBgZXhwb3J0c2Agb2JqZWN0IGV4cG9zZWQgYnkgQ29tbW9uSlMgaW1wbGVtZW50YXRpb25zLlxuICB2YXIgZnJlZUV4cG9ydHMgPSBvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4gIC8vIFVzZSB0aGUgYGdsb2JhbGAgb2JqZWN0IGV4cG9zZWQgYnkgTm9kZSAoaW5jbHVkaW5nIEJyb3dzZXJpZnkgdmlhXG4gIC8vIGBpbnNlcnQtbW9kdWxlLWdsb2JhbHNgKSwgTmFyd2hhbCwgYW5kIFJpbmdvIGFzIHRoZSBkZWZhdWx0IGNvbnRleHQsXG4gIC8vIGFuZCB0aGUgYHdpbmRvd2Agb2JqZWN0IGluIGJyb3dzZXJzLiBSaGlubyBleHBvcnRzIGEgYGdsb2JhbGAgZnVuY3Rpb25cbiAgLy8gaW5zdGVhZC5cbiAgdmFyIHJvb3QgPSBvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cgfHwgdGhpcyxcbiAgICAgIGZyZWVHbG9iYWwgPSBmcmVlRXhwb3J0cyAmJiBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiB0eXBlb2YgZ2xvYmFsID09IFwib2JqZWN0XCIgJiYgZ2xvYmFsO1xuXG4gIGlmIChmcmVlR2xvYmFsICYmIChmcmVlR2xvYmFsW1wiZ2xvYmFsXCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJ3aW5kb3dcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcInNlbGZcIl0gPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgcm9vdCA9IGZyZWVHbG9iYWw7XG4gIH1cblxuICAvLyBQdWJsaWM6IEluaXRpYWxpemVzIEpTT04gMyB1c2luZyB0aGUgZ2l2ZW4gYGNvbnRleHRgIG9iamVjdCwgYXR0YWNoaW5nIHRoZVxuICAvLyBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBmdW5jdGlvbnMgdG8gdGhlIHNwZWNpZmllZCBgZXhwb3J0c2Agb2JqZWN0LlxuICBmdW5jdGlvbiBydW5JbkNvbnRleHQoY29udGV4dCwgZXhwb3J0cykge1xuICAgIGNvbnRleHQgfHwgKGNvbnRleHQgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuICAgIGV4cG9ydHMgfHwgKGV4cG9ydHMgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuXG4gICAgLy8gTmF0aXZlIGNvbnN0cnVjdG9yIGFsaWFzZXMuXG4gICAgdmFyIE51bWJlciA9IGNvbnRleHRbXCJOdW1iZXJcIl0gfHwgcm9vdFtcIk51bWJlclwiXSxcbiAgICAgICAgU3RyaW5nID0gY29udGV4dFtcIlN0cmluZ1wiXSB8fCByb290W1wiU3RyaW5nXCJdLFxuICAgICAgICBPYmplY3QgPSBjb250ZXh0W1wiT2JqZWN0XCJdIHx8IHJvb3RbXCJPYmplY3RcIl0sXG4gICAgICAgIERhdGUgPSBjb250ZXh0W1wiRGF0ZVwiXSB8fCByb290W1wiRGF0ZVwiXSxcbiAgICAgICAgU3ludGF4RXJyb3IgPSBjb250ZXh0W1wiU3ludGF4RXJyb3JcIl0gfHwgcm9vdFtcIlN5bnRheEVycm9yXCJdLFxuICAgICAgICBUeXBlRXJyb3IgPSBjb250ZXh0W1wiVHlwZUVycm9yXCJdIHx8IHJvb3RbXCJUeXBlRXJyb3JcIl0sXG4gICAgICAgIE1hdGggPSBjb250ZXh0W1wiTWF0aFwiXSB8fCByb290W1wiTWF0aFwiXSxcbiAgICAgICAgbmF0aXZlSlNPTiA9IGNvbnRleHRbXCJKU09OXCJdIHx8IHJvb3RbXCJKU09OXCJdO1xuXG4gICAgLy8gRGVsZWdhdGUgdG8gdGhlIG5hdGl2ZSBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBpbXBsZW1lbnRhdGlvbnMuXG4gICAgaWYgKHR5cGVvZiBuYXRpdmVKU09OID09IFwib2JqZWN0XCIgJiYgbmF0aXZlSlNPTikge1xuICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBuYXRpdmVKU09OLnN0cmluZ2lmeTtcbiAgICAgIGV4cG9ydHMucGFyc2UgPSBuYXRpdmVKU09OLnBhcnNlO1xuICAgIH1cblxuICAgIC8vIENvbnZlbmllbmNlIGFsaWFzZXMuXG4gICAgdmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZSxcbiAgICAgICAgZ2V0Q2xhc3MgPSBvYmplY3RQcm90by50b1N0cmluZyxcbiAgICAgICAgaXNQcm9wZXJ0eSwgZm9yRWFjaCwgdW5kZWY7XG5cbiAgICAvLyBUZXN0IHRoZSBgRGF0ZSNnZXRVVEMqYCBtZXRob2RzLiBCYXNlZCBvbiB3b3JrIGJ5IEBZYWZmbGUuXG4gICAgdmFyIGlzRXh0ZW5kZWQgPSBuZXcgRGF0ZSgtMzUwOTgyNzMzNDU3MzI5Mik7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBgZ2V0VVRDRnVsbFllYXJgLCBgTW9udGhgLCBhbmQgYERhdGVgIG1ldGhvZHMgcmV0dXJuIG5vbnNlbnNpY2FsXG4gICAgICAvLyByZXN1bHRzIGZvciBjZXJ0YWluIGRhdGVzIGluIE9wZXJhID49IDEwLjUzLlxuICAgICAgaXNFeHRlbmRlZCA9IGlzRXh0ZW5kZWQuZ2V0VVRDRnVsbFllYXIoKSA9PSAtMTA5MjUyICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTW9udGgoKSA9PT0gMCAmJiBpc0V4dGVuZGVkLmdldFVUQ0RhdGUoKSA9PT0gMSAmJlxuICAgICAgICAvLyBTYWZhcmkgPCAyLjAuMiBzdG9yZXMgdGhlIGludGVybmFsIG1pbGxpc2Vjb25kIHRpbWUgdmFsdWUgY29ycmVjdGx5LFxuICAgICAgICAvLyBidXQgY2xpcHMgdGhlIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgZGF0ZSBtZXRob2RzIHRvIHRoZSByYW5nZSBvZlxuICAgICAgICAvLyBzaWduZWQgMzItYml0IGludGVnZXJzIChbLTIgKiogMzEsIDIgKiogMzEgLSAxXSkuXG4gICAgICAgIGlzRXh0ZW5kZWQuZ2V0VVRDSG91cnMoKSA9PSAxMCAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbnV0ZXMoKSA9PSAzNyAmJiBpc0V4dGVuZGVkLmdldFVUQ1NlY29uZHMoKSA9PSA2ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgPT0gNzA4O1xuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cblxuICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG5hdGl2ZSBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgcGFyc2VgXG4gICAgLy8gaW1wbGVtZW50YXRpb25zIGFyZSBzcGVjLWNvbXBsaWFudC4gQmFzZWQgb24gd29yayBieSBLZW4gU255ZGVyLlxuICAgIGZ1bmN0aW9uIGhhcyhuYW1lKSB7XG4gICAgICBpZiAoaGFzW25hbWVdICE9PSB1bmRlZikge1xuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIGZlYXR1cmUgdGVzdCByZXN1bHQuXG4gICAgICAgIHJldHVybiBoYXNbbmFtZV07XG4gICAgICB9XG4gICAgICB2YXIgaXNTdXBwb3J0ZWQ7XG4gICAgICBpZiAobmFtZSA9PSBcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKSB7XG4gICAgICAgIC8vIElFIDw9IDcgZG9lc24ndCBzdXBwb3J0IGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyB1c2luZyBzcXVhcmVcbiAgICAgICAgLy8gYnJhY2tldCBub3RhdGlvbi4gSUUgOCBvbmx5IHN1cHBvcnRzIHRoaXMgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gXCJhXCJbMF0gIT0gXCJhXCI7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT0gXCJqc29uXCIpIHtcbiAgICAgICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgYm90aCBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgSlNPTi5wYXJzZWAgYXJlXG4gICAgICAgIC8vIHN1cHBvcnRlZC5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBoYXMoXCJqc29uLXN0cmluZ2lmeVwiKSAmJiBoYXMoXCJqc29uLXBhcnNlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHZhbHVlLCBzZXJpYWxpemVkID0gJ3tcImFcIjpbMSx0cnVlLGZhbHNlLG51bGwsXCJcXFxcdTAwMDBcXFxcYlxcXFxuXFxcXGZcXFxcclxcXFx0XCJdfSc7XG4gICAgICAgIC8vIFRlc3QgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXN0cmluZ2lmeVwiKSB7XG4gICAgICAgICAgdmFyIHN0cmluZ2lmeSA9IGV4cG9ydHMuc3RyaW5naWZ5LCBzdHJpbmdpZnlTdXBwb3J0ZWQgPSB0eXBlb2Ygc3RyaW5naWZ5ID09IFwiZnVuY3Rpb25cIiAmJiBpc0V4dGVuZGVkO1xuICAgICAgICAgIGlmIChzdHJpbmdpZnlTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgIC8vIEEgdGVzdCBmdW5jdGlvbiBvYmplY3Qgd2l0aCBhIGN1c3RvbSBgdG9KU09OYCBtZXRob2QuXG4gICAgICAgICAgICAodmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSkudG9KU09OID0gdmFsdWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPVxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggMy4xYjEgYW5kIGIyIHNlcmlhbGl6ZSBzdHJpbmcsIG51bWJlciwgYW5kIGJvb2xlYW5cbiAgICAgICAgICAgICAgICAvLyBwcmltaXRpdmVzIGFzIG9iamVjdCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoMCkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyLCBhbmQgSlNPTiAyIHNlcmlhbGl6ZSB3cmFwcGVkIHByaW1pdGl2ZXMgYXMgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBOdW1iZXIoKSkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBTdHJpbmcoKSkgPT0gJ1wiXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIHZhbHVlIGlzIGBudWxsYCwgYHVuZGVmaW5lZGAsIG9yXG4gICAgICAgICAgICAgICAgLy8gZG9lcyBub3QgZGVmaW5lIGEgY2Fub25pY2FsIEpTT04gcmVwcmVzZW50YXRpb24gKHRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBgdG9KU09OYCBwcm9wZXJ0aWVzIGFzIHdlbGwsICp1bmxlc3MqIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIHdpdGhpbiBhbiBvYmplY3Qgb3IgYXJyYXkpLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShnZXRDbGFzcykgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gSUUgOCBzZXJpYWxpemVzIGB1bmRlZmluZWRgIGFzIGBcInVuZGVmaW5lZFwiYC4gU2FmYXJpIDw9IDUuMS43IGFuZFxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIzIHBhc3MgdGhpcyB0ZXN0LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh1bmRlZikgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS43IGFuZCBGRiAzLjFiMyB0aHJvdyBgRXJyb3JgcyBhbmQgYFR5cGVFcnJvcmBzLFxuICAgICAgICAgICAgICAgIC8vIHJlc3BlY3RpdmVseSwgaWYgdGhlIHZhbHVlIGlzIG9taXR0ZWQgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KCkgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIG5vdCBhIG51bWJlcixcbiAgICAgICAgICAgICAgICAvLyBzdHJpbmcsIGFycmF5LCBvYmplY3QsIEJvb2xlYW4sIG9yIGBudWxsYCBsaXRlcmFsLiBUaGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMgYXMgd2VsbCwgdW5sZXNzIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIGluc2lkZSBvYmplY3Qgb3IgYXJyYXkgbGl0ZXJhbHMuIFlVSSAzLjAuMGIxIGlnbm9yZXMgY3VzdG9tIGB0b0pTT05gXG4gICAgICAgICAgICAgICAgLy8gbWV0aG9kcyBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdmFsdWVdKSA9PSBcIlsxXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIHNlcmlhbGl6ZXMgYFt1bmRlZmluZWRdYCBhcyBgXCJbXVwiYCBpbnN0ZWFkIG9mXG4gICAgICAgICAgICAgICAgLy8gYFwiW251bGxdXCJgLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWZdKSA9PSBcIltudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gWVVJIDMuMC4wYjEgZmFpbHMgdG8gc2VyaWFsaXplIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCkgPT0gXCJudWxsXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiBoYWx0cyBzZXJpYWxpemF0aW9uIGlmIGFuIGFycmF5IGNvbnRhaW5zIGEgZnVuY3Rpb246XG4gICAgICAgICAgICAgICAgLy8gYFsxLCB0cnVlLCBnZXRDbGFzcywgMV1gIHNlcmlhbGl6ZXMgYXMgXCJbMSx0cnVlLF0sXCIuIEZGIDMuMWIzXG4gICAgICAgICAgICAgICAgLy8gZWxpZGVzIG5vbi1KU09OIHZhbHVlcyBmcm9tIG9iamVjdHMgYW5kIGFycmF5cywgdW5sZXNzIHRoZXlcbiAgICAgICAgICAgICAgICAvLyBkZWZpbmUgY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZiwgZ2V0Q2xhc3MsIG51bGxdKSA9PSBcIltudWxsLG51bGwsbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzZXJpYWxpemF0aW9uIHRlc3QuIEZGIDMuMWIxIHVzZXMgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2VzXG4gICAgICAgICAgICAgICAgLy8gd2hlcmUgY2hhcmFjdGVyIGVzY2FwZSBjb2RlcyBhcmUgZXhwZWN0ZWQgKGUuZy4sIGBcXGJgID0+IGBcXHUwMDA4YCkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHsgXCJhXCI6IFt2YWx1ZSwgdHJ1ZSwgZmFsc2UsIG51bGwsIFwiXFx4MDBcXGJcXG5cXGZcXHJcXHRcIl0gfSkgPT0gc2VyaWFsaXplZCAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxIGFuZCBiMiBpZ25vcmUgdGhlIGBmaWx0ZXJgIGFuZCBgd2lkdGhgIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCwgdmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbMSwgMl0sIG51bGwsIDEpID09IFwiW1xcbiAxLFxcbiAyXFxuXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gSlNPTiAyLCBQcm90b3R5cGUgPD0gMS43LCBhbmQgb2xkZXIgV2ViS2l0IGJ1aWxkcyBpbmNvcnJlY3RseVxuICAgICAgICAgICAgICAgIC8vIHNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTguNjRlMTUpKSA9PSAnXCItMjcxODIxLTA0LTIwVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBUaGUgbWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSg4LjY0ZTE1KSkgPT0gJ1wiKzI3NTc2MC0wOS0xM1QwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCA8PSAxMS4wIGluY29ycmVjdGx5IHNlcmlhbGl6ZXMgeWVhcnMgcHJpb3IgdG8gMCBhcyBuZWdhdGl2ZVxuICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgeWVhcnMgaW5zdGVhZCBvZiBzaXgtZGlnaXQgeWVhcnMuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC02MjE5ODc1NTJlNSkpID09ICdcIi0wMDAwMDEtMDEtMDFUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNSBhbmQgT3BlcmEgPj0gMTAuNTMgaW5jb3JyZWN0bHkgc2VyaWFsaXplIG1pbGxpc2Vjb25kXG4gICAgICAgICAgICAgICAgLy8gdmFsdWVzIGxlc3MgdGhhbiAxMDAwLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtMSkpID09ICdcIjE5NjktMTItMzFUMjM6NTk6NTkuOTk5WlwiJztcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBzdHJpbmdpZnlTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGVzdCBgSlNPTi5wYXJzZWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1wYXJzZVwiKSB7XG4gICAgICAgICAgdmFyIHBhcnNlID0gZXhwb3J0cy5wYXJzZTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyIHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGEgYmFyZSBsaXRlcmFsIGlzIHByb3ZpZGVkLlxuICAgICAgICAgICAgICAvLyBDb25mb3JtaW5nIGltcGxlbWVudGF0aW9ucyBzaG91bGQgYWxzbyBjb2VyY2UgdGhlIGluaXRpYWwgYXJndW1lbnQgdG9cbiAgICAgICAgICAgICAgLy8gYSBzdHJpbmcgcHJpb3IgdG8gcGFyc2luZy5cbiAgICAgICAgICAgICAgaWYgKHBhcnNlKFwiMFwiKSA9PT0gMCAmJiAhcGFyc2UoZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHBhcnNpbmcgdGVzdC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcnNlKHNlcmlhbGl6ZWQpO1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZVN1cHBvcnRlZCA9IHZhbHVlW1wiYVwiXS5sZW5ndGggPT0gNSAmJiB2YWx1ZVtcImFcIl1bMF0gPT09IDE7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjIgYW5kIEZGIDMuMWIxIGFsbG93IHVuZXNjYXBlZCB0YWJzIGluIHN0cmluZ3MuXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gIXBhcnNlKCdcIlxcdFwiJyk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAgYW5kIDQuMC4xIGFsbG93IGxlYWRpbmcgYCtgIHNpZ25zIGFuZCBsZWFkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgLy8gZGVjaW1hbCBwb2ludHMuIEZGIDQuMCwgNC4wLjEsIGFuZCBJRSA5LTEwIGFsc28gYWxsb3dcbiAgICAgICAgICAgICAgICAgICAgICAvLyBjZXJ0YWluIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIwMVwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wLCA0LjAuMSwgYW5kIFJoaW5vIDEuN1IzLVI0IGFsbG93IHRyYWlsaW5nIGRlY2ltYWxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBwb2ludHMuIFRoZXNlIGVudmlyb25tZW50cywgYWxvbmcgd2l0aCBGRiAzLjFiMSBhbmQgMixcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIGFsbG93IHRyYWlsaW5nIGNvbW1hcyBpbiBKU09OIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMS5cIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHBhcnNlU3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzW25hbWVdID0gISFpc1N1cHBvcnRlZDtcbiAgICB9XG5cbiAgICBpZiAodHJ1ZSkgeyAvLyB1c2VkIHRvIGJlICFoYXMoXCJqc29uXCIpXG4gICAgICAvLyBDb21tb24gYFtbQ2xhc3NdXWAgbmFtZSBhbGlhc2VzLlxuICAgICAgdmFyIGZ1bmN0aW9uQ2xhc3MgPSBcIltvYmplY3QgRnVuY3Rpb25dXCIsXG4gICAgICAgICAgZGF0ZUNsYXNzID0gXCJbb2JqZWN0IERhdGVdXCIsXG4gICAgICAgICAgbnVtYmVyQ2xhc3MgPSBcIltvYmplY3QgTnVtYmVyXVwiLFxuICAgICAgICAgIHN0cmluZ0NsYXNzID0gXCJbb2JqZWN0IFN0cmluZ11cIixcbiAgICAgICAgICBhcnJheUNsYXNzID0gXCJbb2JqZWN0IEFycmF5XVwiLFxuICAgICAgICAgIGJvb2xlYW5DbGFzcyA9IFwiW29iamVjdCBCb29sZWFuXVwiO1xuXG4gICAgICAvLyBEZXRlY3QgaW5jb21wbGV0ZSBzdXBwb3J0IGZvciBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgYnkgaW5kZXguXG4gICAgICB2YXIgY2hhckluZGV4QnVnZ3kgPSBoYXMoXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIik7XG5cbiAgICAgIC8vIERlZmluZSBhZGRpdGlvbmFsIHV0aWxpdHkgbWV0aG9kcyBpZiB0aGUgYERhdGVgIG1ldGhvZHMgYXJlIGJ1Z2d5LlxuICAgICAgaWYgKCFpc0V4dGVuZGVkKSB7XG4gICAgICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3I7XG4gICAgICAgIC8vIEEgbWFwcGluZyBiZXR3ZWVuIHRoZSBtb250aHMgb2YgdGhlIHllYXIgYW5kIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuXG4gICAgICAgIC8vIEphbnVhcnkgMXN0IGFuZCB0aGUgZmlyc3Qgb2YgdGhlIHJlc3BlY3RpdmUgbW9udGguXG4gICAgICAgIHZhciBNb250aHMgPSBbMCwgMzEsIDU5LCA5MCwgMTIwLCAxNTEsIDE4MSwgMjEyLCAyNDMsIDI3MywgMzA0LCAzMzRdO1xuICAgICAgICAvLyBJbnRlcm5hbDogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlbiB0aGUgVW5peCBlcG9jaCBhbmQgdGhlXG4gICAgICAgIC8vIGZpcnN0IGRheSBvZiB0aGUgZ2l2ZW4gbW9udGguXG4gICAgICAgIHZhciBnZXREYXkgPSBmdW5jdGlvbiAoeWVhciwgbW9udGgpIHtcbiAgICAgICAgICByZXR1cm4gTW9udGhzW21vbnRoXSArIDM2NSAqICh5ZWFyIC0gMTk3MCkgKyBmbG9vcigoeWVhciAtIDE5NjkgKyAobW9udGggPSArKG1vbnRoID4gMSkpKSAvIDQpIC0gZmxvb3IoKHllYXIgLSAxOTAxICsgbW9udGgpIC8gMTAwKSArIGZsb29yKCh5ZWFyIC0gMTYwMSArIG1vbnRoKSAvIDQwMCk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIGlmIGEgcHJvcGVydHkgaXMgYSBkaXJlY3QgcHJvcGVydHkgb2YgdGhlIGdpdmVuXG4gICAgICAvLyBvYmplY3QuIERlbGVnYXRlcyB0byB0aGUgbmF0aXZlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIG1ldGhvZC5cbiAgICAgIGlmICghKGlzUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eSkpIHtcbiAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGNvbnN0cnVjdG9yO1xuICAgICAgICAgIGlmICgobWVtYmVycy5fX3Byb3RvX18gPSBudWxsLCBtZW1iZXJzLl9fcHJvdG9fXyA9IHtcbiAgICAgICAgICAgIC8vIFRoZSAqcHJvdG8qIHByb3BlcnR5IGNhbm5vdCBiZSBzZXQgbXVsdGlwbGUgdGltZXMgaW4gcmVjZW50XG4gICAgICAgICAgICAvLyB2ZXJzaW9ucyBvZiBGaXJlZm94IGFuZCBTZWFNb25rZXkuXG4gICAgICAgICAgICBcInRvU3RyaW5nXCI6IDFcbiAgICAgICAgICB9LCBtZW1iZXJzKS50b1N0cmluZyAhPSBnZXRDbGFzcykge1xuICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC4zIGRvZXNuJ3QgaW1wbGVtZW50IGBPYmplY3QjaGFzT3duUHJvcGVydHlgLCBidXRcbiAgICAgICAgICAgIC8vIHN1cHBvcnRzIHRoZSBtdXRhYmxlICpwcm90byogcHJvcGVydHkuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIC8vIENhcHR1cmUgYW5kIGJyZWFrIHRoZSBvYmplY3QncyBwcm90b3R5cGUgY2hhaW4gKHNlZSBzZWN0aW9uIDguNi4yXG4gICAgICAgICAgICAgIC8vIG9mIHRoZSBFUyA1LjEgc3BlYykuIFRoZSBwYXJlbnRoZXNpemVkIGV4cHJlc3Npb24gcHJldmVudHMgYW5cbiAgICAgICAgICAgICAgLy8gdW5zYWZlIHRyYW5zZm9ybWF0aW9uIGJ5IHRoZSBDbG9zdXJlIENvbXBpbGVyLlxuICAgICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzLl9fcHJvdG9fXywgcmVzdWx0ID0gcHJvcGVydHkgaW4gKHRoaXMuX19wcm90b19fID0gbnVsbCwgdGhpcyk7XG4gICAgICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHByb3RvdHlwZSBjaGFpbi5cbiAgICAgICAgICAgICAgdGhpcy5fX3Byb3RvX18gPSBvcmlnaW5hbDtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENhcHR1cmUgYSByZWZlcmVuY2UgdG8gdGhlIHRvcC1sZXZlbCBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICAgIGNvbnN0cnVjdG9yID0gbWVtYmVycy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSB0byBzaW11bGF0ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpblxuICAgICAgICAgICAgLy8gb3RoZXIgZW52aXJvbm1lbnRzLlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gKHRoaXMuY29uc3RydWN0b3IgfHwgY29uc3RydWN0b3IpLnByb3RvdHlwZTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgIShwcm9wZXJ0eSBpbiBwYXJlbnQgJiYgdGhpc1twcm9wZXJ0eV0gPT09IHBhcmVudFtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWVtYmVycyA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGlzUHJvcGVydHkuY2FsbCh0aGlzLCBwcm9wZXJ0eSk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBOb3JtYWxpemVzIHRoZSBgZm9yLi4uaW5gIGl0ZXJhdGlvbiBhbGdvcml0aG0gYWNyb3NzXG4gICAgICAvLyBlbnZpcm9ubWVudHMuIEVhY2ggZW51bWVyYXRlZCBrZXkgaXMgeWllbGRlZCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uXG4gICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNpemUgPSAwLCBQcm9wZXJ0aWVzLCBtZW1iZXJzLCBwcm9wZXJ0eTtcblxuICAgICAgICAvLyBUZXN0cyBmb3IgYnVncyBpbiB0aGUgY3VycmVudCBlbnZpcm9ubWVudCdzIGBmb3IuLi5pbmAgYWxnb3JpdGhtLiBUaGVcbiAgICAgICAgLy8gYHZhbHVlT2ZgIHByb3BlcnR5IGluaGVyaXRzIHRoZSBub24tZW51bWVyYWJsZSBmbGFnIGZyb21cbiAgICAgICAgLy8gYE9iamVjdC5wcm90b3R5cGVgIGluIG9sZGVyIHZlcnNpb25zIG9mIElFLCBOZXRzY2FwZSwgYW5kIE1vemlsbGEuXG4gICAgICAgIChQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoaXMudmFsdWVPZiA9IDA7XG4gICAgICAgIH0pLnByb3RvdHlwZS52YWx1ZU9mID0gMDtcblxuICAgICAgICAvLyBJdGVyYXRlIG92ZXIgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIGBQcm9wZXJ0aWVzYCBjbGFzcy5cbiAgICAgICAgbWVtYmVycyA9IG5ldyBQcm9wZXJ0aWVzKCk7XG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gbWVtYmVycykge1xuICAgICAgICAgIC8vIElnbm9yZSBhbGwgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgaWYgKGlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgUHJvcGVydGllcyA9IG1lbWJlcnMgPSBudWxsO1xuXG4gICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgaXRlcmF0aW9uIGFsZ29yaXRobS5cbiAgICAgICAgaWYgKCFzaXplKSB7XG4gICAgICAgICAgLy8gQSBsaXN0IG9mIG5vbi1lbnVtZXJhYmxlIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIG1lbWJlcnMgPSBbXCJ2YWx1ZU9mXCIsIFwidG9TdHJpbmdcIiwgXCJ0b0xvY2FsZVN0cmluZ1wiLCBcInByb3BlcnR5SXNFbnVtZXJhYmxlXCIsIFwiaXNQcm90b3R5cGVPZlwiLCBcImhhc093blByb3BlcnR5XCIsIFwiY29uc3RydWN0b3JcIl07XG4gICAgICAgICAgLy8gSUUgPD0gOCwgTW96aWxsYSAxLjAsIGFuZCBOZXRzY2FwZSA2LjIgaWdub3JlIHNoYWRvd2VkIG5vbi1lbnVtZXJhYmxlXG4gICAgICAgICAgLy8gcHJvcGVydGllcy5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBsZW5ndGg7XG4gICAgICAgICAgICB2YXIgaGFzUHJvcGVydHkgPSAhaXNGdW5jdGlvbiAmJiB0eXBlb2Ygb2JqZWN0LmNvbnN0cnVjdG9yICE9IFwiZnVuY3Rpb25cIiAmJiBvYmplY3RUeXBlc1t0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5XSAmJiBvYmplY3QuaGFzT3duUHJvcGVydHkgfHwgaXNQcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIEdlY2tvIDw9IDEuMCBlbnVtZXJhdGVzIHRoZSBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgdW5kZXJcbiAgICAgICAgICAgICAgLy8gY2VydGFpbiBjb25kaXRpb25zOyBJRSBkb2VzIG5vdC5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciBlYWNoIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBtZW1iZXJzLmxlbmd0aDsgcHJvcGVydHkgPSBtZW1iZXJzWy0tbGVuZ3RoXTsgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiBjYWxsYmFjayhwcm9wZXJ0eSkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoc2l6ZSA9PSAyKSB7XG4gICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC40IGVudW1lcmF0ZXMgc2hhZG93ZWQgcHJvcGVydGllcyB0d2ljZS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNldCBvZiBpdGVyYXRlZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIFN0b3JlIGVhY2ggcHJvcGVydHkgbmFtZSB0byBwcmV2ZW50IGRvdWJsZSBlbnVtZXJhdGlvbi4gVGhlXG4gICAgICAgICAgICAgIC8vIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyBpcyBub3QgZW51bWVyYXRlZCBkdWUgdG8gY3Jvc3MtXG4gICAgICAgICAgICAgIC8vIGVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiAhaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSAmJiAobWVtYmVyc1twcm9wZXJ0eV0gPSAxKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIGJ1Z3MgZGV0ZWN0ZWQ7IHVzZSB0aGUgc3RhbmRhcmQgYGZvci4uLmluYCBhbGdvcml0aG0uXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgaXNDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmICEoaXNDb25zdHJ1Y3RvciA9IHByb3BlcnR5ID09PSBcImNvbnN0cnVjdG9yXCIpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSBkdWUgdG9cbiAgICAgICAgICAgIC8vIGNyb3NzLWVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgIGlmIChpc0NvbnN0cnVjdG9yIHx8IGlzUHJvcGVydHkuY2FsbChvYmplY3QsIChwcm9wZXJ0eSA9IFwiY29uc3RydWN0b3JcIikpKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JFYWNoKG9iamVjdCwgY2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgLy8gUHVibGljOiBTZXJpYWxpemVzIGEgSmF2YVNjcmlwdCBgdmFsdWVgIGFzIGEgSlNPTiBzdHJpbmcuIFRoZSBvcHRpb25hbFxuICAgICAgLy8gYGZpbHRlcmAgYXJndW1lbnQgbWF5IHNwZWNpZnkgZWl0aGVyIGEgZnVuY3Rpb24gdGhhdCBhbHRlcnMgaG93IG9iamVjdCBhbmRcbiAgICAgIC8vIGFycmF5IG1lbWJlcnMgYXJlIHNlcmlhbGl6ZWQsIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MgYW5kIG51bWJlcnMgdGhhdFxuICAgICAgLy8gaW5kaWNhdGVzIHdoaWNoIHByb3BlcnRpZXMgc2hvdWxkIGJlIHNlcmlhbGl6ZWQuIFRoZSBvcHRpb25hbCBgd2lkdGhgXG4gICAgICAvLyBhcmd1bWVudCBtYXkgYmUgZWl0aGVyIGEgc3RyaW5nIG9yIG51bWJlciB0aGF0IHNwZWNpZmllcyB0aGUgaW5kZW50YXRpb25cbiAgICAgIC8vIGxldmVsIG9mIHRoZSBvdXRwdXQuXG4gICAgICBpZiAodHJ1ZSkge1xuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciBlc2NhcGVkIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgRXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXFxcXFwiJyxcbiAgICAgICAgICA4OiBcIlxcXFxiXCIsXG4gICAgICAgICAgMTI6IFwiXFxcXGZcIixcbiAgICAgICAgICAxMDogXCJcXFxcblwiLFxuICAgICAgICAgIDEzOiBcIlxcXFxyXCIsXG4gICAgICAgICAgOTogXCJcXFxcdFwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IENvbnZlcnRzIGB2YWx1ZWAgaW50byBhIHplcm8tcGFkZGVkIHN0cmluZyBzdWNoIHRoYXQgaXRzXG4gICAgICAgIC8vIGxlbmd0aCBpcyBhdCBsZWFzdCBlcXVhbCB0byBgd2lkdGhgLiBUaGUgYHdpZHRoYCBtdXN0IGJlIDw9IDYuXG4gICAgICAgIHZhciBsZWFkaW5nWmVyb2VzID0gXCIwMDAwMDBcIjtcbiAgICAgICAgdmFyIHRvUGFkZGVkU3RyaW5nID0gZnVuY3Rpb24gKHdpZHRoLCB2YWx1ZSkge1xuICAgICAgICAgIC8vIFRoZSBgfHwgMGAgZXhwcmVzc2lvbiBpcyBuZWNlc3NhcnkgdG8gd29yayBhcm91bmQgYSBidWcgaW5cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgd2hlcmUgYDAgPT0gLTBgLCBidXQgYFN0cmluZygtMCkgIT09IFwiMFwiYC5cbiAgICAgICAgICByZXR1cm4gKGxlYWRpbmdaZXJvZXMgKyAodmFsdWUgfHwgMCkpLnNsaWNlKC13aWR0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IERvdWJsZS1xdW90ZXMgYSBzdHJpbmcgYHZhbHVlYCwgcmVwbGFjaW5nIGFsbCBBU0NJSSBjb250cm9sXG4gICAgICAgIC8vIGNoYXJhY3RlcnMgKGNoYXJhY3RlcnMgd2l0aCBjb2RlIHVuaXQgdmFsdWVzIGJldHdlZW4gMCBhbmQgMzEpIHdpdGhcbiAgICAgICAgLy8gdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFF1b3RlKHZhbHVlKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cbiAgICAgICAgdmFyIHVuaWNvZGVQcmVmaXggPSBcIlxcXFx1MDBcIjtcbiAgICAgICAgdmFyIHF1b3RlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCA9ICdcIicsIGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoLCB1c2VDaGFySW5kZXggPSAhY2hhckluZGV4QnVnZ3kgfHwgbGVuZ3RoID4gMTA7XG4gICAgICAgICAgdmFyIHN5bWJvbHMgPSB1c2VDaGFySW5kZXggJiYgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuc3BsaXQoXCJcIikgOiB2YWx1ZSk7XG4gICAgICAgICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICB2YXIgY2hhckNvZGUgPSB2YWx1ZS5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICAgICAgICAgIC8vIElmIHRoZSBjaGFyYWN0ZXIgaXMgYSBjb250cm9sIGNoYXJhY3RlciwgYXBwZW5kIGl0cyBVbmljb2RlIG9yXG4gICAgICAgICAgICAvLyBzaG9ydGhhbmQgZXNjYXBlIHNlcXVlbmNlOyBvdGhlcndpc2UsIGFwcGVuZCB0aGUgY2hhcmFjdGVyIGFzLWlzLlxuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDg6IGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMjogY2FzZSAxMzogY2FzZSAzNDogY2FzZSA5MjpcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gRXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSB1bmljb2RlUHJlZml4ICsgdG9QYWRkZWRTdHJpbmcoMiwgY2hhckNvZGUudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gdXNlQ2hhckluZGV4ID8gc3ltYm9sc1tpbmRleF0gOiB2YWx1ZS5jaGFyQXQoaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0ICsgJ1wiJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgc2VyaWFsaXplcyBhbiBvYmplY3QuIEltcGxlbWVudHMgdGhlXG4gICAgICAgIC8vIGBTdHIoa2V5LCBob2xkZXIpYCwgYEpPKHZhbHVlKWAsIGFuZCBgSkEodmFsdWUpYCBvcGVyYXRpb25zLlxuICAgICAgICB2YXIgc2VyaWFsaXplID0gZnVuY3Rpb24gKHByb3BlcnR5LCBvYmplY3QsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbiwgc3RhY2ssIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUsIGNsYXNzTmFtZSwgeWVhciwgbW9udGgsIGRhdGUsIHRpbWUsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIHJlc3VsdHMsIGVsZW1lbnQsIGluZGV4LCBsZW5ndGgsIHByZWZpeCwgcmVzdWx0O1xuXG4gICAgICAgICAgbWF4TGluZUxlbmd0aCA9IG1heExpbmVMZW5ndGggfHwgMDtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBOZWNlc3NhcnkgZm9yIGhvc3Qgb2JqZWN0IHN1cHBvcnQuXG4gICAgICAgICAgICB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGRhdGVDbGFzcyAmJiAhaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGVzIGFyZSBzZXJpYWxpemVkIGFjY29yZGluZyB0byB0aGUgYERhdGUjdG9KU09OYCBtZXRob2RcbiAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuOS41LjQ0LiBTZWUgc2VjdGlvbiAxNS45LjEuMTVcbiAgICAgICAgICAgICAgICAvLyBmb3IgdGhlIElTTyA4NjAxIGRhdGUgdGltZSBzdHJpbmcgZm9ybWF0LlxuICAgICAgICAgICAgICAgIGlmIChnZXREYXkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbXB1dGUgdGhlIHllYXIsIG1vbnRoLCBkYXRlLCBob3VycywgbWludXRlcyxcbiAgICAgICAgICAgICAgICAgIC8vIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgaWYgdGhlIGBnZXRVVEMqYCBtZXRob2RzIGFyZVxuICAgICAgICAgICAgICAgICAgLy8gYnVnZ3kuIEFkYXB0ZWQgZnJvbSBAWWFmZmxlJ3MgYGRhdGUtc2hpbWAgcHJvamVjdC5cbiAgICAgICAgICAgICAgICAgIGRhdGUgPSBmbG9vcih2YWx1ZSAvIDg2NGU1KTtcbiAgICAgICAgICAgICAgICAgIGZvciAoeWVhciA9IGZsb29yKGRhdGUgLyAzNjUuMjQyNSkgKyAxOTcwIC0gMTsgZ2V0RGF5KHllYXIgKyAxLCAwKSA8PSBkYXRlOyB5ZWFyKyspO1xuICAgICAgICAgICAgICAgICAgZm9yIChtb250aCA9IGZsb29yKChkYXRlIC0gZ2V0RGF5KHllYXIsIDApKSAvIDMwLjQyKTsgZ2V0RGF5KHllYXIsIG1vbnRoICsgMSkgPD0gZGF0ZTsgbW9udGgrKyk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gMSArIGRhdGUgLSBnZXREYXkoeWVhciwgbW9udGgpO1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGB0aW1lYCB2YWx1ZSBzcGVjaWZpZXMgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkgKHNlZSBFU1xuICAgICAgICAgICAgICAgICAgLy8gNS4xIHNlY3Rpb24gMTUuOS4xLjIpLiBUaGUgZm9ybXVsYSBgKEEgJSBCICsgQikgJSBCYCBpcyB1c2VkXG4gICAgICAgICAgICAgICAgICAvLyB0byBjb21wdXRlIGBBIG1vZHVsbyBCYCwgYXMgdGhlIGAlYCBvcGVyYXRvciBkb2VzIG5vdFxuICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZCB0byB0aGUgYG1vZHVsb2Agb3BlcmF0aW9uIGZvciBuZWdhdGl2ZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgICAgdGltZSA9ICh2YWx1ZSAlIDg2NGU1ICsgODY0ZTUpICUgODY0ZTU7XG4gICAgICAgICAgICAgICAgICAvLyBUaGUgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgYXJlIG9idGFpbmVkIGJ5XG4gICAgICAgICAgICAgICAgICAvLyBkZWNvbXBvc2luZyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheS4gU2VlIHNlY3Rpb24gMTUuOS4xLjEwLlxuICAgICAgICAgICAgICAgICAgaG91cnMgPSBmbG9vcih0aW1lIC8gMzZlNSkgJSAyNDtcbiAgICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSBmbG9vcih0aW1lIC8gNmU0KSAlIDYwO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IGZsb29yKHRpbWUgLyAxZTMpICUgNjA7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB0aW1lICUgMWUzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB5ZWFyID0gdmFsdWUuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICAgICAgICAgICAgICAgIG1vbnRoID0gdmFsdWUuZ2V0VVRDTW9udGgoKTtcbiAgICAgICAgICAgICAgICAgIGRhdGUgPSB2YWx1ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgICAgICAgICAgICBob3VycyA9IHZhbHVlLmdldFVUQ0hvdXJzKCk7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gdmFsdWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IHZhbHVlLmdldFVUQ1NlY29uZHMoKTtcbiAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IHZhbHVlLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMgY29ycmVjdGx5LlxuICAgICAgICAgICAgICAgIHZhbHVlID0gKHllYXIgPD0gMCB8fCB5ZWFyID49IDFlNCA/ICh5ZWFyIDwgMCA/IFwiLVwiIDogXCIrXCIpICsgdG9QYWRkZWRTdHJpbmcoNiwgeWVhciA8IDAgPyAteWVhciA6IHllYXIpIDogdG9QYWRkZWRTdHJpbmcoNCwgeWVhcikpICtcbiAgICAgICAgICAgICAgICAgIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbW9udGggKyAxKSArIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgZGF0ZSkgK1xuICAgICAgICAgICAgICAgICAgLy8gTW9udGhzLCBkYXRlcywgaG91cnMsIG1pbnV0ZXMsIGFuZCBzZWNvbmRzIHNob3VsZCBoYXZlIHR3b1xuICAgICAgICAgICAgICAgICAgLy8gZGlnaXRzOyBtaWxsaXNlY29uZHMgc2hvdWxkIGhhdmUgdGhyZWUuXG4gICAgICAgICAgICAgICAgICBcIlRcIiArIHRvUGFkZGVkU3RyaW5nKDIsIGhvdXJzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbWludXRlcykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIHNlY29uZHMpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNS4wLCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgICAgXCIuXCIgKyB0b1BhZGRlZFN0cmluZygzLCBtaWxsaXNlY29uZHMpICsgXCJaXCI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZS50b0pTT04gPT0gXCJmdW5jdGlvblwiICYmICgoY2xhc3NOYW1lICE9IG51bWJlckNsYXNzICYmIGNsYXNzTmFtZSAhPSBzdHJpbmdDbGFzcyAmJiBjbGFzc05hbWUgIT0gYXJyYXlDbGFzcykgfHwgaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkpIHtcbiAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIGFkZHMgbm9uLXN0YW5kYXJkIGB0b0pTT05gIG1ldGhvZHMgdG8gdGhlXG4gICAgICAgICAgICAgIC8vIGBOdW1iZXJgLCBgU3RyaW5nYCwgYERhdGVgLCBhbmQgYEFycmF5YCBwcm90b3R5cGVzLiBKU09OIDNcbiAgICAgICAgICAgICAgLy8gaWdub3JlcyBhbGwgYHRvSlNPTmAgbWV0aG9kcyBvbiB0aGVzZSBvYmplY3RzIHVubGVzcyB0aGV5IGFyZVxuICAgICAgICAgICAgICAvLyBkZWZpbmVkIGRpcmVjdGx5IG9uIGFuIGluc3RhbmNlLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvSlNPTihwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gSWYgYSByZXBsYWNlbWVudCBmdW5jdGlvbiB3YXMgcHJvdmlkZWQsIGNhbGwgaXQgdG8gb2J0YWluIHRoZSB2YWx1ZVxuICAgICAgICAgICAgLy8gZm9yIHNlcmlhbGl6YXRpb24uXG4gICAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrLmNhbGwob2JqZWN0LCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBib29sZWFuQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIEJvb2xlYW5zIGFyZSByZXByZXNlbnRlZCBsaXRlcmFsbHkuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArIHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAvLyBKU09OIG51bWJlcnMgbXVzdCBiZSBmaW5pdGUuIGBJbmZpbml0eWAgYW5kIGBOYU5gIGFyZSBzZXJpYWxpemVkIGFzXG4gICAgICAgICAgICAvLyBgXCJudWxsXCJgLlxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDAgPyBcIlwiICsgdmFsdWUgOiBcIm51bGxcIjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgLy8gU3RyaW5ncyBhcmUgZG91YmxlLXF1b3RlZCBhbmQgZXNjYXBlZC5cbiAgICAgICAgICAgIHJldHVybiBxdW90ZShcIlwiICsgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGlzIGlzIGEgbGluZWFyIHNlYXJjaDsgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgIC8vIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZiB1bmlxdWUgbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHN0YWNrLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgIGlmIChzdGFja1tsZW5ndGhdID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEN5Y2xpYyBzdHJ1Y3R1cmVzIGNhbm5vdCBiZSBzZXJpYWxpemVkIGJ5IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFkZCB0aGUgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBpbmRlbnRhdGlvbiBsZXZlbCBhbmQgaW5kZW50IG9uZSBhZGRpdGlvbmFsIGxldmVsLlxuICAgICAgICAgICAgcHJlZml4ID0gaW5kZW50YXRpb247XG4gICAgICAgICAgICBpbmRlbnRhdGlvbiArPSB3aGl0ZXNwYWNlO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgcmVzdWx0O1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgYXJyYXkgZWxlbWVudHMuXG4gICAgICAgICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHNlcmlhbGl6ZShpbmRleCwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50ID09PSB1bmRlZiA/IFwibnVsbFwiIDogZWxlbWVudDtcbiAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4ID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIltcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwiXVwiIDpcbiAgICAgICAgICAgICAgICAgIFwiW1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwiXVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJbXVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gaW5kZW50YXRpb24ubGVuZ3RoLCBpbmRleD0wO1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0IG1lbWJlcnMuIE1lbWJlcnMgYXJlIHNlbGVjdGVkIGZyb21cbiAgICAgICAgICAgICAgLy8gZWl0aGVyIGEgdXNlci1zcGVjaWZpZWQgbGlzdCBvZiBwcm9wZXJ0eSBuYW1lcywgb3IgdGhlIG9iamVjdFxuICAgICAgICAgICAgICAvLyBpdHNlbGYuXG4gICAgICAgICAgICAgIGZvckVhY2gocHJvcGVydGllcyB8fCB2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCwgZWxlbWVudCA9IHNlcmlhbGl6ZShwcm9wZXJ0eSwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFjY29yZGluZyB0byBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zOiBcIklmIGBnYXBgIHt3aGl0ZXNwYWNlfVxuICAgICAgICAgICAgICAgICAgLy8gaXMgbm90IHRoZSBlbXB0eSBzdHJpbmcsIGxldCBgbWVtYmVyYCB7cXVvdGUocHJvcGVydHkpICsgXCI6XCJ9XG4gICAgICAgICAgICAgICAgICAvLyBiZSB0aGUgY29uY2F0ZW5hdGlvbiBvZiBgbWVtYmVyYCBhbmQgdGhlIGBzcGFjZWAgY2hhcmFjdGVyLlwiXG4gICAgICAgICAgICAgICAgICAvLyBUaGUgXCJgc3BhY2VgIGNoYXJhY3RlclwiIHJlZmVycyB0byB0aGUgbGl0ZXJhbCBzcGFjZVxuICAgICAgICAgICAgICAgICAgLy8gY2hhcmFjdGVyLCBub3QgdGhlIGBzcGFjZWAge3dpZHRofSBhcmd1bWVudCBwcm92aWRlZCB0b1xuICAgICAgICAgICAgICAgICAgLy8gYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHF1b3RlKHByb3BlcnR5KSArIFwiOlwiICsgKHdoaXRlc3BhY2UgPyBcIiBcIiA6IFwiXCIpICsgZWxlbWVudDtcbiAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IHJlc3VsdC5sZW5ndGggKyAoaW5kZXgrKyA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIntcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwifVwiIDpcbiAgICAgICAgICAgICAgICAgIFwie1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwifVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJ7fVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBvYmplY3QgZnJvbSB0aGUgdHJhdmVyc2VkIG9iamVjdCBzdGFjay5cbiAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5zdHJpbmdpZnlgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cblxuICAgICAgICBleHBvcnRzLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGZpbHRlciwgd2lkdGgsIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgd2hpdGVzcGFjZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIGNsYXNzTmFtZTtcbiAgICAgICAgICBpZiAob2JqZWN0VHlwZXNbdHlwZW9mIGZpbHRlcl0gJiYgZmlsdGVyKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwoZmlsdGVyKSkgPT0gZnVuY3Rpb25DbGFzcykge1xuICAgICAgICAgICAgICBjYWxsYmFjayA9IGZpbHRlcjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgcHJvcGVydHkgbmFtZXMgYXJyYXkgaW50byBhIG1ha2VzaGlmdCBzZXQuXG4gICAgICAgICAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBmaWx0ZXIubGVuZ3RoLCB2YWx1ZTsgaW5kZXggPCBsZW5ndGg7IHZhbHVlID0gZmlsdGVyW2luZGV4KytdLCAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpKSwgY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzIHx8IGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykgJiYgKHByb3BlcnRpZXNbdmFsdWVdID0gMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAod2lkdGgpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh3aWR0aCkpID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIGB3aWR0aGAgdG8gYW4gaW50ZWdlciBhbmQgY3JlYXRlIGEgc3RyaW5nIGNvbnRhaW5pbmdcbiAgICAgICAgICAgICAgLy8gYHdpZHRoYCBudW1iZXIgb2Ygc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgaWYgKCh3aWR0aCAtPSB3aWR0aCAlIDEpID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAod2hpdGVzcGFjZSA9IFwiXCIsIHdpZHRoID4gMTAgJiYgKHdpZHRoID0gMTApOyB3aGl0ZXNwYWNlLmxlbmd0aCA8IHdpZHRoOyB3aGl0ZXNwYWNlICs9IFwiIFwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgICAgd2hpdGVzcGFjZSA9IHdpZHRoLmxlbmd0aCA8PSAxMCA/IHdpZHRoIDogd2lkdGguc2xpY2UoMCwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgZGlzY2FyZHMgdGhlIHZhbHVlcyBhc3NvY2lhdGVkIHdpdGggZW1wdHkgc3RyaW5nIGtleXNcbiAgICAgICAgICAvLyAoYFwiXCJgKSBvbmx5IGlmIHRoZXkgYXJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGFuIG9iamVjdCBtZW1iZXIgbGlzdFxuICAgICAgICAgIC8vIChlLmcuLCBgIShcIlwiIGluIHsgXCJcIjogMX0pYCkuXG4gICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZShcIlwiLCAodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSBzb3VyY2UsIHZhbHVlKSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIFwiXCIsIFtdLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBleHBvcnRzLmNvbXBhY3RTdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoKXtcbiAgICAgICAgICByZXR1cm4gZXhwb3J0cy5zdHJpbmdpZnkoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCA2MCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUHVibGljOiBQYXJzZXMgYSBKU09OIHNvdXJjZSBzdHJpbmcuXG4gICAgICBpZiAoIWhhcyhcImpzb24tcGFyc2VcIikpIHtcbiAgICAgICAgdmFyIGZyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciB1bmVzY2FwZWRcbiAgICAgICAgLy8gZXF1aXZhbGVudHMuXG4gICAgICAgIHZhciBVbmVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXCInLFxuICAgICAgICAgIDQ3OiBcIi9cIixcbiAgICAgICAgICA5ODogXCJcXGJcIixcbiAgICAgICAgICAxMTY6IFwiXFx0XCIsXG4gICAgICAgICAgMTEwOiBcIlxcblwiLFxuICAgICAgICAgIDEwMjogXCJcXGZcIixcbiAgICAgICAgICAxMTQ6IFwiXFxyXCJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogU3RvcmVzIHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgIHZhciBJbmRleCwgU291cmNlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXNldHMgdGhlIHBhcnNlciBzdGF0ZSBhbmQgdGhyb3dzIGEgYFN5bnRheEVycm9yYC5cbiAgICAgICAgdmFyIGFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICB0aHJvdyBTeW50YXhFcnJvcigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXR1cm5zIHRoZSBuZXh0IHRva2VuLCBvciBgXCIkXCJgIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWRcbiAgICAgICAgLy8gdGhlIGVuZCBvZiB0aGUgc291cmNlIHN0cmluZy4gQSB0b2tlbiBtYXkgYmUgYSBzdHJpbmcsIG51bWJlciwgYG51bGxgXG4gICAgICAgIC8vIGxpdGVyYWwsIG9yIEJvb2xlYW4gbGl0ZXJhbC5cbiAgICAgICAgdmFyIGxleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgc291cmNlID0gU291cmNlLCBsZW5ndGggPSBzb3VyY2UubGVuZ3RoLCB2YWx1ZSwgYmVnaW4sIHBvc2l0aW9uLCBpc1NpZ25lZCwgY2hhckNvZGU7XG4gICAgICAgICAgd2hpbGUgKEluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEzOiBjYXNlIDMyOlxuICAgICAgICAgICAgICAgIC8vIFNraXAgd2hpdGVzcGFjZSB0b2tlbnMsIGluY2x1ZGluZyB0YWJzLCBjYXJyaWFnZSByZXR1cm5zLCBsaW5lXG4gICAgICAgICAgICAgICAgLy8gZmVlZHMsIGFuZCBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgMTIzOiBjYXNlIDEyNTogY2FzZSA5MTogY2FzZSA5MzogY2FzZSA1ODogY2FzZSA0NDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhIHB1bmN0dWF0b3IgdG9rZW4gKGB7YCwgYH1gLCBgW2AsIGBdYCwgYDpgLCBvciBgLGApIGF0XG4gICAgICAgICAgICAgICAgLy8gdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBjaGFySW5kZXhCdWdneSA/IHNvdXJjZS5jaGFyQXQoSW5kZXgpIDogc291cmNlW0luZGV4XTtcbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgY2FzZSAzNDpcbiAgICAgICAgICAgICAgICAvLyBgXCJgIGRlbGltaXRzIGEgSlNPTiBzdHJpbmc7IGFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZFxuICAgICAgICAgICAgICAgIC8vIGJlZ2luIHBhcnNpbmcgdGhlIHN0cmluZy4gU3RyaW5nIHRva2VucyBhcmUgcHJlZml4ZWQgd2l0aCB0aGVcbiAgICAgICAgICAgICAgICAvLyBzZW50aW5lbCBgQGAgY2hhcmFjdGVyIHRvIGRpc3Rpbmd1aXNoIHRoZW0gZnJvbSBwdW5jdHVhdG9ycyBhbmRcbiAgICAgICAgICAgICAgICAvLyBlbmQtb2Ytc3RyaW5nIHRva2Vucy5cbiAgICAgICAgICAgICAgICBmb3IgKHZhbHVlID0gXCJAXCIsIEluZGV4Kys7IEluZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVbmVzY2FwZWQgQVNDSUkgY29udHJvbCBjaGFyYWN0ZXJzICh0aG9zZSB3aXRoIGEgY29kZSB1bml0XG4gICAgICAgICAgICAgICAgICAgIC8vIGxlc3MgdGhhbiB0aGUgc3BhY2UgY2hhcmFjdGVyKSBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhckNvZGUgPT0gOTIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSByZXZlcnNlIHNvbGlkdXMgKGBcXGApIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYW4gZXNjYXBlZFxuICAgICAgICAgICAgICAgICAgICAvLyBjb250cm9sIGNoYXJhY3RlciAoaW5jbHVkaW5nIGBcImAsIGBcXGAsIGFuZCBgL2ApIG9yIFVuaWNvZGVcbiAgICAgICAgICAgICAgICAgICAgLy8gZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSA5MjogY2FzZSAzNDogY2FzZSA0NzogY2FzZSA5ODogY2FzZSAxMTY6IGNhc2UgMTEwOiBjYXNlIDEwMjogY2FzZSAxMTQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBVbmVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTE3OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYFxcdWAgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgZmlyc3QgY2hhcmFjdGVyIGFuZCB2YWxpZGF0ZSB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgY29kZSBwb2ludC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZ2luID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleCArIDQ7IEluZGV4IDwgcG9zaXRpb247IEluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEEgdmFsaWQgc2VxdWVuY2UgY29tcHJpc2VzIGZvdXIgaGV4ZGlnaXRzIChjYXNlLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnNlbnNpdGl2ZSkgdGhhdCBmb3JtIGEgc2luZ2xlIGhleGFkZWNpbWFsIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NyB8fCBjaGFyQ29kZSA+PSA5NyAmJiBjaGFyQ29kZSA8PSAxMDIgfHwgY2hhckNvZGUgPj0gNjUgJiYgY2hhckNvZGUgPD0gNzApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgdGhlIGVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gZnJvbUNoYXJDb2RlKFwiMHhcIiArIHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEFuIHVuZXNjYXBlZCBkb3VibGUtcXVvdGUgY2hhcmFjdGVyIG1hcmtzIHRoZSBlbmQgb2YgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgLy8gc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBPcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiBjYXNlIHdoZXJlIGEgc3RyaW5nIGlzIHZhbGlkLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY2hhckNvZGUgPj0gMzIgJiYgY2hhckNvZGUgIT0gOTIgJiYgY2hhckNvZGUgIT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGVuZCB0aGUgc3RyaW5nIGFzLWlzLlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kIHJldHVybiB0aGUgcmV2aXZlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnRlcm1pbmF0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgbnVtYmVycyBhbmQgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHBhc3QgdGhlIG5lZ2F0aXZlIHNpZ24sIGlmIG9uZSBpcyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhbiBpbnRlZ2VyIG9yIGZsb2F0aW5nLXBvaW50IHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nykge1xuICAgICAgICAgICAgICAgICAgLy8gTGVhZGluZyB6ZXJvZXMgYXJlIGludGVycHJldGVkIGFzIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ4ICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCArIDEpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgb2N0YWwgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgaW50ZWdlciBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICBmb3IgKDsgSW5kZXggPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgSW5kZXgrKyk7XG4gICAgICAgICAgICAgICAgICAvLyBGbG9hdHMgY2Fubm90IGNvbnRhaW4gYSBsZWFkaW5nIGRlY2ltYWwgcG9pbnQ7IGhvd2V2ZXIsIHRoaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UgaXMgYWxyZWFkeSBhY2NvdW50ZWQgZm9yIGJ5IHRoZSBwYXJzZXIuXG4gICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDQ2KSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGRlY2ltYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgdHJhaWxpbmcgZGVjaW1hbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSBleHBvbmVudHMuIFRoZSBgZWAgZGVub3RpbmcgdGhlIGV4cG9uZW50IGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlLWluc2Vuc2l0aXZlLlxuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMTAxIHx8IGNoYXJDb2RlID09IDY5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXAgcGFzdCB0aGUgc2lnbiBmb2xsb3dpbmcgdGhlIGV4cG9uZW50LCBpZiBvbmUgaXNcbiAgICAgICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDMgfHwgY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBleHBvbmVudGlhbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgZW1wdHkgZXhwb25lbnQuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gQ29lcmNlIHRoZSBwYXJzZWQgdmFsdWUgdG8gYSBKYXZhU2NyaXB0IG51bWJlci5cbiAgICAgICAgICAgICAgICAgIHJldHVybiArc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEEgbmVnYXRpdmUgc2lnbiBtYXkgb25seSBwcmVjZWRlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBgdHJ1ZWAsIGBmYWxzZWAsIGFuZCBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDUpID09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcIm51bGxcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnJlY29nbml6ZWQgdG9rZW4uXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmV0dXJuIHRoZSBzZW50aW5lbCBgJGAgY2hhcmFjdGVyIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWQgdGhlIGVuZFxuICAgICAgICAgIC8vIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLlxuICAgICAgICAgIHJldHVybiBcIiRcIjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUGFyc2VzIGEgSlNPTiBgdmFsdWVgIHRva2VuLlxuICAgICAgICB2YXIgZ2V0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdHMsIGhhc01lbWJlcnM7XG4gICAgICAgICAgaWYgKHZhbHVlID09IFwiJFwiKSB7XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgaWYgKChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSA9PSBcIkBcIikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5zbGljZSgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBhcnNlIG9iamVjdCBhbmQgYXJyYXkgbGl0ZXJhbHMuXG4gICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJbXCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBhcnJheSwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgYXJyYXkuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBzcXVhcmUgYnJhY2tldCBtYXJrcyB0aGUgZW5kIG9mIHRoZSBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBhcnJheSBsaXRlcmFsIGNvbnRhaW5zIGVsZW1lbnRzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRpbmcgdGhlIHByZXZpb3VzIGVsZW1lbnQgZnJvbSB0aGVcbiAgICAgICAgICAgICAgICAvLyBuZXh0LlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggYXJyYXkgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRWxpc2lvbnMgYW5kIGxlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldCh2YWx1ZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PSBcIntcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIG9iamVjdCwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgb2JqZWN0LlxuICAgICAgICAgICAgICByZXN1bHRzID0ge307XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3NpbmcgY3VybHkgYnJhY2UgbWFya3MgdGhlIGVuZCBvZiB0aGUgb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG9iamVjdCBsaXRlcmFsIGNvbnRhaW5zIG1lbWJlcnMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdG9yLlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIG9iamVjdCBtZW1iZXIuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLCBvYmplY3QgcHJvcGVydHkgbmFtZXMgbXVzdCBiZVxuICAgICAgICAgICAgICAgIC8vIGRvdWJsZS1xdW90ZWQgc3RyaW5ncywgYW5kIGEgYDpgIG11c3Qgc2VwYXJhdGUgZWFjaCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIC8vIG5hbWUgYW5kIHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIiB8fCB0eXBlb2YgdmFsdWUgIT0gXCJzdHJpbmdcIiB8fCAoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgIT0gXCJAXCIgfHwgbGV4KCkgIT0gXCI6XCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNbdmFsdWUuc2xpY2UoMSldID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdG9rZW4gZW5jb3VudGVyZWQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFVwZGF0ZXMgYSB0cmF2ZXJzZWQgb2JqZWN0IG1lbWJlci5cbiAgICAgICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciBlbGVtZW50ID0gd2Fsayhzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgaWYgKGVsZW1lbnQgPT09IHVuZGVmKSB7XG4gICAgICAgICAgICBkZWxldGUgc291cmNlW3Byb3BlcnR5XTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291cmNlW3Byb3BlcnR5XSA9IGVsZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYSBwYXJzZWQgSlNPTiBvYmplY3QsIGludm9raW5nIHRoZVxuICAgICAgICAvLyBgY2FsbGJhY2tgIGZ1bmN0aW9uIGZvciBlYWNoIHZhbHVlLiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZVxuICAgICAgICAvLyBgV2Fsayhob2xkZXIsIG5hbWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICB2YXIgd2FsayA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IHNvdXJjZVtwcm9wZXJ0eV0sIGxlbmd0aDtcbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGBmb3JFYWNoYCBjYW4ndCBiZSB1c2VkIHRvIHRyYXZlcnNlIGFuIGFycmF5IGluIE9wZXJhIDw9IDguNTRcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaXRzIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGltcGxlbWVudGF0aW9uIHJldHVybnMgYGZhbHNlYFxuICAgICAgICAgICAgLy8gZm9yIGFycmF5IGluZGljZXMgKGUuZy4sIGAhWzEsIDIsIDNdLmhhc093blByb3BlcnR5KFwiMFwiKWApLlxuICAgICAgICAgICAgaWYgKGdldENsYXNzLmNhbGwodmFsdWUpID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgZm9yIChsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgbGVuZ3RoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvckVhY2godmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKHNvdXJjZSwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdWJsaWM6IGBKU09OLnBhcnNlYC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIGV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoc291cmNlLCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciByZXN1bHQsIHZhbHVlO1xuICAgICAgICAgIEluZGV4ID0gMDtcbiAgICAgICAgICBTb3VyY2UgPSBcIlwiICsgc291cmNlO1xuICAgICAgICAgIHJlc3VsdCA9IGdldChsZXgoKSk7XG4gICAgICAgICAgLy8gSWYgYSBKU09OIHN0cmluZyBjb250YWlucyBtdWx0aXBsZSB0b2tlbnMsIGl0IGlzIGludmFsaWQuXG4gICAgICAgICAgaWYgKGxleCgpICE9IFwiJFwiKSB7XG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXNldCB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sgJiYgZ2V0Q2xhc3MuY2FsbChjYWxsYmFjaykgPT0gZnVuY3Rpb25DbGFzcyA/IHdhbGsoKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gcmVzdWx0LCB2YWx1ZSksIFwiXCIsIGNhbGxiYWNrKSA6IHJlc3VsdDtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBleHBvcnRzW1wicnVuSW5Db250ZXh0XCJdID0gcnVuSW5Db250ZXh0O1xuICAgIHJldHVybiBleHBvcnRzO1xuICB9XG5cbiAgaWYgKGZyZWVFeHBvcnRzICYmICFpc0xvYWRlcikge1xuICAgIC8vIEV4cG9ydCBmb3IgQ29tbW9uSlMgZW52aXJvbm1lbnRzLlxuICAgIHJ1bkluQ29udGV4dChyb290LCBmcmVlRXhwb3J0cyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhwb3J0IGZvciB3ZWIgYnJvd3NlcnMgYW5kIEphdmFTY3JpcHQgZW5naW5lcy5cbiAgICB2YXIgbmF0aXZlSlNPTiA9IHJvb3QuSlNPTixcbiAgICAgICAgcHJldmlvdXNKU09OID0gcm9vdFtcIkpTT04zXCJdLFxuICAgICAgICBpc1Jlc3RvcmVkID0gZmFsc2U7XG5cbiAgICB2YXIgSlNPTjMgPSBydW5JbkNvbnRleHQocm9vdCwgKHJvb3RbXCJKU09OM1wiXSA9IHtcbiAgICAgIC8vIFB1YmxpYzogUmVzdG9yZXMgdGhlIG9yaWdpbmFsIHZhbHVlIG9mIHRoZSBnbG9iYWwgYEpTT05gIG9iamVjdCBhbmRcbiAgICAgIC8vIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGBKU09OM2Agb2JqZWN0LlxuICAgICAgXCJub0NvbmZsaWN0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFpc1Jlc3RvcmVkKSB7XG4gICAgICAgICAgaXNSZXN0b3JlZCA9IHRydWU7XG4gICAgICAgICAgcm9vdC5KU09OID0gbmF0aXZlSlNPTjtcbiAgICAgICAgICByb290W1wiSlNPTjNcIl0gPSBwcmV2aW91c0pTT047XG4gICAgICAgICAgbmF0aXZlSlNPTiA9IHByZXZpb3VzSlNPTiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEpTT04zO1xuICAgICAgfVxuICAgIH0pKTtcblxuICAgIHJvb3QuSlNPTiA9IHtcbiAgICAgIFwicGFyc2VcIjogSlNPTjMucGFyc2UsXG4gICAgICBcInN0cmluZ2lmeVwiOiBKU09OMy5zdHJpbmdpZnlcbiAgICB9O1xuICB9XG5cbiAgLy8gRXhwb3J0IGZvciBhc3luY2hyb25vdXMgbW9kdWxlIGxvYWRlcnMuXG4gIGlmIChpc0xvYWRlcikge1xuICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gSlNPTjM7XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iLCJ3aW5kb3cuICAgICB2bFNjaGVtYSA9IHtcbiAgXCJvbmVPZlwiOiBbXG4gICAge1xuICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9FeHRlbmRlZFVuaXRTcGVjXCIsXG4gICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2NoZW1hIGZvciBhIHVuaXQgVmVnYS1MaXRlIHNwZWNpZmljYXRpb24sIHdpdGggdGhlIHN5bnRhY3RpYyBzdWdhciBleHRlbnNpb25zOlxcblxcbi0gYHJvd2AgYW5kIGBjb2x1bW5gIGFyZSBpbmNsdWRlZCBpbiB0aGUgZW5jb2RpbmcuXFxuXFxuLSAoRnV0dXJlKSBsYWJlbCwgYm94IHBsb3RcXG5cXG5cXG5cXG5Ob3RlOiB0aGUgc3BlYyBjb3VsZCBjb250YWluIGZhY2V0LlwiXG4gICAgfSxcbiAgICB7XG4gICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0U3BlY1wiXG4gICAgfSxcbiAgICB7XG4gICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0xheWVyU3BlY1wiXG4gICAgfVxuICBdLFxuICBcImRlZmluaXRpb25zXCI6IHtcbiAgICBcIkV4dGVuZGVkVW5pdFNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1hcmtcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWFyayB0eXBlLlxcblxcbk9uZSBvZiBgXFxcImJhclxcXCJgLCBgXFxcImNpcmNsZVxcXCJgLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcInRpY2tcXFwiYCwgYFxcXCJsaW5lXFxcImAsXFxuXFxuYFxcXCJhcmVhXFxcImAsIGBcXFwicG9pbnRcXFwiYCwgYFxcXCJydWxlXFxcImAsIGFuZCBgXFxcInRleHRcXFwiYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImVuY29kaW5nXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0VuY29kaW5nXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEga2V5LXZhbHVlIG1hcHBpbmcgYmV0d2VlbiBlbmNvZGluZyBjaGFubmVscyBhbmQgZGVmaW5pdGlvbiBvZiBmaWVsZHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJuYW1lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgdmlzdWFsaXphdGlvbiBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGlzIG1hcmsgZm9yIGNvbW1lbnRpbmcgcHVycG9zZS5cXG5cXG5UaGlzIHByb3BlcnR5IGhhcyBubyBlZmZlY3Qgb24gdGhlIG91dHB1dCB2aXN1YWxpemF0aW9uLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBkYXRhIHNvdXJjZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHJhbnNmb3JtXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RyYW5zZm9ybVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyBmaWx0ZXIgYW5kIG5ldyBmaWVsZCBjYWxjdWxhdGlvbi5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbmZpZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Db25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29uZmlndXJhdGlvbiBvYmplY3RcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwibWFya1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk1hcmtcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImFyZWFcIixcbiAgICAgICAgXCJiYXJcIixcbiAgICAgICAgXCJsaW5lXCIsXG4gICAgICAgIFwicG9pbnRcIixcbiAgICAgICAgXCJ0ZXh0XCIsXG4gICAgICAgIFwidGlja1wiLFxuICAgICAgICBcInJ1bGVcIixcbiAgICAgICAgXCJjaXJjbGVcIixcbiAgICAgICAgXCJzcXVhcmVcIixcbiAgICAgICAgXCJlcnJvckJhclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkVuY29kaW5nXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3dcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlZlcnRpY2FsIGZhY2V0cyBmb3IgdHJlbGxpcyBwbG90cy5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbHVtblwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSG9yaXpvbnRhbCBmYWNldHMgZm9yIHRyZWxsaXMgcGxvdHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ4XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkgY29vcmRpbmF0ZXMgZm9yIGBwb2ludGAsIGBjaXJjbGVgLCBgc3F1YXJlYCxcXG5cXG5gbGluZWAsIGBydWxlYCwgYHRleHRgLCBhbmQgYHRpY2tgXFxuXFxuKG9yIHRvIHdpZHRoIGFuZCBoZWlnaHQgZm9yIGBiYXJgIGFuZCBgYXJlYWAgbWFya3MpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieDJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlgyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5MlwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWTIgY29vcmRpbmF0ZXMgZm9yIHJhbmdlZCBgYmFyYCwgYHJ1bGVgLCBgYXJlYWBcIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSBtYXJrcyDigJMgZWl0aGVyIGZpbGwgb3Igc3Ryb2tlIGNvbG9yIGJhc2VkIG9uIG1hcmsgdHlwZS5cXG5cXG4oQnkgZGVmYXVsdCwgZmlsbCBjb2xvciBmb3IgYGFyZWFgLCBgYmFyYCwgYHRpY2tgLCBgdGV4dGAsIGBjaXJjbGVgLCBhbmQgYHNxdWFyZWAgL1xcblxcbnN0cm9rZSBjb2xvciBmb3IgYGxpbmVgIGFuZCBgcG9pbnRgLilcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3BhY2l0eSBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBjYW4gYmUgYSB2YWx1ZSBvciBpbiBhIHJhbmdlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2l6ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBwb2ludGAsIGBzcXVhcmVgIGFuZCBgY2lyY2xlYFxcblxcbuKAkyB0aGUgc3ltYm9sIHNpemUsIG9yIHBpeGVsIGFyZWEgb2YgdGhlIG1hcmsuXFxuXFxuLSBGb3IgYGJhcmAgYW5kIGB0aWNrYCDigJMgdGhlIGJhciBhbmQgdGljaydzIHNpemUuXFxuXFxuLSBGb3IgYHRleHRgIOKAkyB0aGUgdGV4dCdzIGZvbnQgc2l6ZS5cXG5cXG4tIFNpemUgaXMgY3VycmVudGx5IHVuc3VwcG9ydGVkIGZvciBgbGluZWAgYW5kIGBhcmVhYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzeW1ib2wncyBzaGFwZSAob25seSBmb3IgYHBvaW50YCBtYXJrcykuIFRoZSBzdXBwb3J0ZWQgdmFsdWVzIGFyZVxcblxcbmBcXFwiY2lyY2xlXFxcImAgKGRlZmF1bHQpLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcImNyb3NzXFxcImAsIGBcXFwiZGlhbW9uZFxcXCJgLCBgXFxcInRyaWFuZ2xlLXVwXFxcImAsXFxuXFxub3IgYFxcXCJ0cmlhbmdsZS1kb3duXFxcImAsIG9yIGVsc2UgYSBjdXN0b20gU1ZHIHBhdGggc3RyaW5nLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGV0YWlsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWRkaXRpb25hbCBsZXZlbHMgb2YgZGV0YWlsIGZvciBncm91cGluZyBkYXRhIGluIGFnZ3JlZ2F0ZSB2aWV3cyBhbmRcXG5cXG5pbiBsaW5lIGFuZCBhcmVhIG1hcmtzIHdpdGhvdXQgbWFwcGluZyBkYXRhIHRvIGEgc3BlY2lmaWMgdmlzdWFsIGNoYW5uZWwuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlcmZhY2UgZm9yIGFueSBraW5kIG9mIEZpZWxkRGVmO1xcblxcbkZvciBzaW1wbGljaXR5LCB3ZSBkbyBub3QgZGVjbGFyZSBtdWx0aXBsZSBpbnRlcmZhY2VzIG9mIEZpZWxkRGVmIGxpa2VcXG5cXG53ZSBkbyBmb3IgSlNPTiBzY2hlbWEuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgb2YgdGhlIGB0ZXh0YCBtYXJrLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcmRlciBvZiBkYXRhIHBvaW50cyBpbiBsaW5lIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JkZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJMYXllciBvcmRlciBmb3Igbm9uLXN0YWNrZWQgbWFya3MsIG9yIHN0YWNrIG9yZGVyIGZvciBzdGFja2VkIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiUG9zaXRpb25DaGFubmVsRGVmXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJheGlzXCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzY2FsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TY2FsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic29ydFwiOiB7XG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydEZpZWxkXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydE9yZGVyXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSBmaWVsZCBmcm9tIHdoaWNoIHRvIHB1bGwgYSBkYXRhIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UeXBlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBlbmNvZGVkIGZpZWxkJ3MgdHlwZSBvZiBtZWFzdXJlbWVudC4gVGhpcyBjYW4gYmUgZWl0aGVyIGEgZnVsbCB0eXBlXFxuXFxubmFtZSAoYFxcXCJxdWFudGl0YXRpdmVcXFwiYCwgYFxcXCJ0ZW1wb3JhbFxcXCJgLCBgXFxcIm9yZGluYWxcXFwiYCwgIGFuZCBgXFxcIm5vbWluYWxcXFwiYClcXG5cXG5vciBhbiBpbml0aWFsIGNoYXJhY3RlciBvZiB0aGUgdHlwZSBuYW1lIChgXFxcIlFcXFwiYCwgYFxcXCJUXFxcImAsIGBcXFwiT1xcXCJgLCBgXFxcIk5cXFwiYCkuXFxuXFxuVGhpcyBwcm9wZXJ0eSBpcyBjYXNlIGluc2Vuc2l0aXZlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGNvbnN0YW50IHZhbHVlIGluIHZpc3VhbCBkb21haW4uXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpbWUgdW5pdCBmb3IgYSBgdGVtcG9yYWxgIGZpZWxkICAoZS5nLiwgYHllYXJgLCBgeWVhcm1vbnRoYCwgYG1vbnRoYCwgYGhvdXJgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZsYWcgZm9yIGJpbm5pbmcgYSBgcXVhbnRpdGF0aXZlYCBmaWVsZCwgb3IgYSBiaW4gcHJvcGVydHkgb2JqZWN0XFxuXFxuZm9yIGJpbm5pbmcgcGFyYW1ldGVycy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0JpblwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQmlubmluZyBwcm9wZXJ0aWVzIG9yIGJvb2xlYW4gZmxhZyBmb3IgZGV0ZXJtaW5pbmcgd2hldGhlciB0byBiaW4gZGF0YSBvciBub3QuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWdncmVnYXRlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIGZvciB0aGUgZmllbGRcXG5cXG4oZS5nLiwgYG1lYW5gLCBgc3VtYCwgYG1lZGlhbmAsIGBtaW5gLCBgbWF4YCwgYGNvdW50YCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpdGxlIGZvciBheGlzIG9yIGxlZ2VuZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkF4aXNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxhYmVsQW5nbGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcm90YXRpb24gYW5nbGUgb2YgdGhlIGF4aXMgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvcm1hdHRpbmcgcGF0dGVybiBmb3IgYXhpcyBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXhpc09yaWVudFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgdGhlIGF4aXMuIE9uZSBvZiB0b3AsIGJvdHRvbSwgbGVmdCBvciByaWdodC4gVGhlIG9yaWVudGF0aW9uIGNhbiBiZSB1c2VkIHRvIGZ1cnRoZXIgc3BlY2lhbGl6ZSB0aGUgYXhpcyB0eXBlIChlLmcuLCBhIHkgYXhpcyBvcmllbnRlZCBmb3IgdGhlIHJpZ2h0IGVkZ2Ugb2YgdGhlIGNoYXJ0KS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBmb3IgdGhlIGF4aXMuIFNob3dzIGZpZWxkIG5hbWUgYW5kIGl0cyBmdW5jdGlvbiBieSBkZWZhdWx0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVzXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc1dpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2lkdGggb2YgdGhlIGF4aXMgbGluZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGF5ZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHN0cmluZyBpbmRpY2F0aW5nIGlmIHRoZSBheGlzIChhbmQgYW55IGdyaWRsaW5lcykgc2hvdWxkIGJlIHBsYWNlZCBhYm92ZSBvciBiZWxvdyB0aGUgZGF0YSBtYXJrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGF4aXMgZnJvbSB0aGUgZWRnZSBvZiB0aGUgZW5jbG9zaW5nIGdyb3VwIG9yIGRhdGEgcmVjdGFuZ2xlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc0NvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgYXhpcyBsaW5lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgZmxhZyBpbmRpY2F0ZSBpZiBncmlkbGluZXMgc2hvdWxkIGJlIGNyZWF0ZWQgaW4gYWRkaXRpb24gdG8gdGlja3MuIElmIGBncmlkYCBpcyB1bnNwZWNpZmllZCwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBST1cgYW5kIENPTC4gRm9yIFggYW5kIFksIHRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYCBmb3IgcXVhbnRpdGF0aXZlIGFuZCB0aW1lIGZpZWxkcyBhbmQgYGZhbHNlYCBvdGhlcndpc2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgZ3JpZGxpbmVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZERhc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IChpbiBwaXhlbHMpIGludG8gd2hpY2ggdG8gYmVnaW4gZHJhd2luZyB3aXRoIHRoZSBncmlkIGRhc2ggYXJyYXkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSBvcGFjaXR5IG9mIGdyaWQgKHZhbHVlIGJldHdlZW4gWzAsMV0pXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZ3JpZCB3aWR0aCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRW5hYmxlIG9yIGRpc2FibGUgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQWxpZ25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IGFsaWdubWVudCBmb3IgdGhlIExhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxCYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgYmFzZWxpbmUgZm9yIHRoZSBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsTWF4TGVuZ3RoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVHJ1bmNhdGUgbGFiZWxzIHRoYXQgYXJlIHRvbyBsb25nLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBhbmQgZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdWJkaXZpZGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiBwcm92aWRlZCwgc2V0cyB0aGUgbnVtYmVyIG9mIG1pbm9yIHRpY2tzIGJldHdlZW4gbWFqb3IgdGlja3MgKHRoZSB2YWx1ZSA5IHJlc3VsdHMgaW4gZGVjaW1hbCBzdWJkaXZpc2lvbikuIE9ubHkgYXBwbGljYWJsZSBmb3IgYXhlcyB2aXN1YWxpemluZyBxdWFudGl0YXRpdmUgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja3NcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGRlc2lyZWQgbnVtYmVyIG9mIHRpY2tzLCBmb3IgYXhlcyB2aXN1YWxpemluZyBxdWFudGl0YXRpdmUgc2NhbGVzLiBUaGUgcmVzdWx0aW5nIG51bWJlciBtYXkgYmUgZGlmZmVyZW50IHNvIHRoYXQgdmFsdWVzIGFyZSBcXFwibmljZVxcXCIgKG11bHRpcGxlcyBvZiAyLCA1LCAxMCkgYW5kIGxpZSB3aXRoaW4gdGhlIHVuZGVybHlpbmcgc2NhbGUncyByYW5nZS5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgYXhpcydzIHRpY2suXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgdGljayBsYWJlbCwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbEZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgdGljayBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbEZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiBsYWJlbCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1BhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGFkZGluZywgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRpY2tzIGFuZCB0ZXh0IGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWFqb3IsIG1pbm9yIGFuZCBlbmQgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZU1ham9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWFqb3IgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZU1pbm9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWlub3IgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZUVuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIGVuZCB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCwgaW4gcGl4ZWxzLCBvZiB0aWNrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiB0aGUgdGl0bGUsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGb250IG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldlaWdodCBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZU9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgdGl0bGUgb2Zmc2V0IHZhbHVlIGZvciB0aGUgYXhpcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlTWF4TGVuZ3RoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTWF4IGxlbmd0aCBmb3IgYXhpcyB0aXRsZSBpZiB0aGUgdGl0bGUgaXMgYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgZnJvbSB0aGUgZmllbGQncyBkZXNjcmlwdGlvbi4gQnkgZGVmYXVsdCwgdGhpcyBpcyBhdXRvbWF0aWNhbGx5IGJhc2VkIG9uIGNlbGwgc2l6ZSBhbmQgY2hhcmFjdGVyV2lkdGggcHJvcGVydHkuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjaGFyYWN0ZXJXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNoYXJhY3RlciB3aWR0aCBmb3IgYXV0b21hdGljYWxseSBkZXRlcm1pbmluZyB0aXRsZSBtYXggbGVuZ3RoLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBheGlzIHN0eWxpbmcuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJBeGlzT3JpZW50XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ0b3BcIixcbiAgICAgICAgXCJyaWdodFwiLFxuICAgICAgICBcImxlZnRcIixcbiAgICAgICAgXCJib3R0b21cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJTY2FsZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TY2FsZVR5cGVcIlxuICAgICAgICB9LFxuICAgICAgICBcImRvbWFpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBkb21haW4gb2YgdGhlIHNjYWxlLCByZXByZXNlbnRpbmcgdGhlIHNldCBvZiBkYXRhIHZhbHVlcy4gRm9yIHF1YW50aXRhdGl2ZSBkYXRhLCB0aGlzIGNhbiB0YWtlIHRoZSBmb3JtIG9mIGEgdHdvLWVsZW1lbnQgYXJyYXkgd2l0aCBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlcy4gRm9yIG9yZGluYWwvY2F0ZWdvcmljYWwgZGF0YSwgdGhpcyBtYXkgYmUgYW4gYXJyYXkgb2YgdmFsaWQgaW5wdXQgdmFsdWVzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHJhbmdlIG9mIHRoZSBzY2FsZSwgcmVwcmVzZW50aW5nIHRoZSBzZXQgb2YgdmlzdWFsIHZhbHVlcy4gRm9yIG51bWVyaWMgdmFsdWVzLCB0aGUgcmFuZ2UgY2FuIHRha2UgdGhlIGZvcm0gb2YgYSB0d28tZWxlbWVudCBhcnJheSB3aXRoIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWVzLiBGb3Igb3JkaW5hbCBvciBxdWFudGl6ZWQgZGF0YSwgdGhlIHJhbmdlIG1heSBieSBhbiBhcnJheSBvZiBkZXNpcmVkIG91dHB1dCB2YWx1ZXMsIHdoaWNoIGFyZSBtYXBwZWQgdG8gZWxlbWVudHMgaW4gdGhlIHNwZWNpZmllZCBkb21haW4uIEZvciBvcmRpbmFsIHNjYWxlcyBvbmx5LCB0aGUgcmFuZ2UgY2FuIGJlIGRlZmluZWQgdXNpbmcgYSBEYXRhUmVmOiB0aGUgcmFuZ2UgdmFsdWVzIGFyZSB0aGVuIGRyYXduIGR5bmFtaWNhbGx5IGZyb20gYSBiYWNraW5nIGRhdGEgc2V0LlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHRydWUsIHJvdW5kcyBudW1lcmljIG91dHB1dCB2YWx1ZXMgdG8gaW50ZWdlcnMuIFRoaXMgY2FuIGJlIGhlbHBmdWwgZm9yIHNuYXBwaW5nIHRvIHRoZSBwaXhlbCBncmlkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJhbmRTaXplXCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBcHBsaWVzIHNwYWNpbmcgYW1vbmcgb3JkaW5hbCBlbGVtZW50cyBpbiB0aGUgc2NhbGUgcmFuZ2UuIFRoZSBhY3R1YWwgZWZmZWN0IGRlcGVuZHMgb24gaG93IHRoZSBzY2FsZSBpcyBjb25maWd1cmVkLiBJZiB0aGUgX19wb2ludHNfXyBwYXJhbWV0ZXIgaXMgYHRydWVgLCB0aGUgcGFkZGluZyB2YWx1ZSBpcyBpbnRlcnByZXRlZCBhcyBhIG11bHRpcGxlIG9mIHRoZSBzcGFjaW5nIGJldHdlZW4gcG9pbnRzLiBBIHJlYXNvbmFibGUgdmFsdWUgaXMgMS4wLCBzdWNoIHRoYXQgdGhlIGZpcnN0IGFuZCBsYXN0IHBvaW50IHdpbGwgYmUgb2Zmc2V0IGZyb20gdGhlIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWUgYnkgaGFsZiB0aGUgZGlzdGFuY2UgYmV0d2VlbiBwb2ludHMuIE90aGVyd2lzZSwgcGFkZGluZyBpcyB0eXBpY2FsbHkgaW4gdGhlIHJhbmdlIFswLCAxXSBhbmQgY29ycmVzcG9uZHMgdG8gdGhlIGZyYWN0aW9uIG9mIHNwYWNlIGluIHRoZSByYW5nZSBpbnRlcnZhbCB0byBhbGxvY2F0ZSB0byBwYWRkaW5nLiBBIHZhbHVlIG9mIDAuNSBtZWFucyB0aGF0IHRoZSByYW5nZSBiYW5kIHdpZHRoIHdpbGwgYmUgZXF1YWwgdG8gdGhlIHBhZGRpbmcgd2lkdGguIEZvciBtb3JlLCBzZWUgdGhlIFtEMyBvcmRpbmFsIHNjYWxlIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9tYm9zdG9jay9kMy93aWtpL09yZGluYWwtU2NhbGVzKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNsYW1wXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgdHJ1ZSwgdmFsdWVzIHRoYXQgZXhjZWVkIHRoZSBkYXRhIGRvbWFpbiBhcmUgY2xhbXBlZCB0byBlaXRoZXIgdGhlIG1pbmltdW0gb3IgbWF4aW11bSByYW5nZSB2YWx1ZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5pY2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiBzcGVjaWZpZWQsIG1vZGlmaWVzIHRoZSBzY2FsZSBkb21haW4gdG8gdXNlIGEgbW9yZSBodW1hbi1mcmllbmRseSB2YWx1ZSByYW5nZS4gSWYgc3BlY2lmaWVkIGFzIGEgdHJ1ZSBib29sZWFuLCBtb2RpZmllcyB0aGUgc2NhbGUgZG9tYWluIHRvIHVzZSBhIG1vcmUgaHVtYW4tZnJpZW5kbHkgbnVtYmVyIHJhbmdlIChlLmcuLCA3IGluc3RlYWQgb2YgNi45NikuIElmIHNwZWNpZmllZCBhcyBhIHN0cmluZywgbW9kaWZpZXMgdGhlIHNjYWxlIGRvbWFpbiB0byB1c2UgYSBtb3JlIGh1bWFuLWZyaWVuZGx5IHZhbHVlIHJhbmdlLiBGb3IgdGltZSBhbmQgdXRjIHNjYWxlIHR5cGVzIG9ubHksIHRoZSBuaWNlIHZhbHVlIHNob3VsZCBiZSBhIHN0cmluZyBpbmRpY2F0aW5nIHRoZSBkZXNpcmVkIHRpbWUgaW50ZXJ2YWwuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9OaWNlVGltZVwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImV4cG9uZW50XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2V0cyB0aGUgZXhwb25lbnQgb2YgdGhlIHNjYWxlIHRyYW5zZm9ybWF0aW9uLiBGb3IgcG93IHNjYWxlIHR5cGVzIG9ubHksIG90aGVyd2lzZSBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiemVyb1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIGB0cnVlYCwgZW5zdXJlcyB0aGF0IGEgemVybyBiYXNlbGluZSB2YWx1ZSBpcyBpbmNsdWRlZCBpbiB0aGUgc2NhbGUgZG9tYWluLlxcblxcbkRlZmF1bHQgdmFsdWU6IGB0cnVlYCBmb3IgYHhgIGFuZCBgeWAgY2hhbm5lbCBpZiB0aGUgcXVhbnRpdGF0aXZlIGZpZWxkIGlzIG5vdCBiaW5uZWRcXG5cXG5hbmQgbm8gY3VzdG9tIGBkb21haW5gIGlzIHByb3ZpZGVkOyBgZmFsc2VgIG90aGVyd2lzZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ1c2VSYXdEb21haW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJVc2VzIHRoZSBzb3VyY2UgZGF0YSByYW5nZSBhcyBzY2FsZSBkb21haW4gaW5zdGVhZCBvZiBhZ2dyZWdhdGVkIGRhdGEgZm9yIGFnZ3JlZ2F0ZSBheGlzLlxcblxcblRoaXMgcHJvcGVydHkgb25seSB3b3JrcyB3aXRoIGFnZ3JlZ2F0ZSBmdW5jdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyB3aXRoaW4gdGhlIHJhdyBkYXRhIGRvbWFpbiAoYFxcXCJtZWFuXFxcImAsIGBcXFwiYXZlcmFnZVxcXCJgLCBgXFxcInN0ZGV2XFxcImAsIGBcXFwic3RkZXZwXFxcImAsIGBcXFwibWVkaWFuXFxcImAsIGBcXFwicTFcXFwiYCwgYFxcXCJxM1xcXCJgLCBgXFxcIm1pblxcXCJgLCBgXFxcIm1heFxcXCJgKS4gRm9yIG90aGVyIGFnZ3JlZ2F0aW9ucyB0aGF0IHByb2R1Y2UgdmFsdWVzIG91dHNpZGUgb2YgdGhlIHJhdyBkYXRhIGRvbWFpbiAoZS5nLiBgXFxcImNvdW50XFxcImAsIGBcXFwic3VtXFxcImApLCB0aGlzIHByb3BlcnR5IGlzIGlnbm9yZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiU2NhbGVUeXBlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJsaW5lYXJcIixcbiAgICAgICAgXCJsb2dcIixcbiAgICAgICAgXCJwb3dcIixcbiAgICAgICAgXCJzcXJ0XCIsXG4gICAgICAgIFwicXVhbnRpbGVcIixcbiAgICAgICAgXCJxdWFudGl6ZVwiLFxuICAgICAgICBcIm9yZGluYWxcIixcbiAgICAgICAgXCJ0aW1lXCIsXG4gICAgICAgIFwidXRjXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiTmljZVRpbWVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInNlY29uZFwiLFxuICAgICAgICBcIm1pbnV0ZVwiLFxuICAgICAgICBcImhvdXJcIixcbiAgICAgICAgXCJkYXlcIixcbiAgICAgICAgXCJ3ZWVrXCIsXG4gICAgICAgIFwibW9udGhcIixcbiAgICAgICAgXCJ5ZWFyXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU29ydEZpZWxkXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmaWVsZCBuYW1lIHRvIGFnZ3JlZ2F0ZSBvdmVyLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNvcnQgYWdncmVnYXRpb24gb3BlcmF0b3JcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9yZGVyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRPcmRlclwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcIm9wXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiQWdncmVnYXRlT3BcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInZhbHVlc1wiLFxuICAgICAgICBcImNvdW50XCIsXG4gICAgICAgIFwidmFsaWRcIixcbiAgICAgICAgXCJtaXNzaW5nXCIsXG4gICAgICAgIFwiZGlzdGluY3RcIixcbiAgICAgICAgXCJzdW1cIixcbiAgICAgICAgXCJtZWFuXCIsXG4gICAgICAgIFwiYXZlcmFnZVwiLFxuICAgICAgICBcInZhcmlhbmNlXCIsXG4gICAgICAgIFwidmFyaWFuY2VwXCIsXG4gICAgICAgIFwic3RkZXZcIixcbiAgICAgICAgXCJzdGRldnBcIixcbiAgICAgICAgXCJtZWRpYW5cIixcbiAgICAgICAgXCJxMVwiLFxuICAgICAgICBcInEzXCIsXG4gICAgICAgIFwibW9kZXNrZXdcIixcbiAgICAgICAgXCJtaW5cIixcbiAgICAgICAgXCJtYXhcIixcbiAgICAgICAgXCJhcmdtaW5cIixcbiAgICAgICAgXCJhcmdtYXhcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJTb3J0T3JkZXJcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImFzY2VuZGluZ1wiLFxuICAgICAgICBcImRlc2NlbmRpbmdcIixcbiAgICAgICAgXCJub25lXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVHlwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwicXVhbnRpdGF0aXZlXCIsXG4gICAgICAgIFwib3JkaW5hbFwiLFxuICAgICAgICBcInRlbXBvcmFsXCIsXG4gICAgICAgIFwibm9taW5hbFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlRpbWVVbml0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ5ZWFyXCIsXG4gICAgICAgIFwibW9udGhcIixcbiAgICAgICAgXCJkYXlcIixcbiAgICAgICAgXCJkYXRlXCIsXG4gICAgICAgIFwiaG91cnNcIixcbiAgICAgICAgXCJtaW51dGVzXCIsXG4gICAgICAgIFwic2Vjb25kc1wiLFxuICAgICAgICBcIm1pbGxpc2Vjb25kc1wiLFxuICAgICAgICBcInllYXJtb250aFwiLFxuICAgICAgICBcInllYXJtb250aGRhdGVcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXRlaG91cnNcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXRlaG91cnNtaW51dGVzXCIsXG4gICAgICAgIFwieWVhcm1vbnRoZGF0ZWhvdXJzbWludXRlc3NlY29uZHNcIixcbiAgICAgICAgXCJob3Vyc21pbnV0ZXNcIixcbiAgICAgICAgXCJob3Vyc21pbnV0ZXNzZWNvbmRzXCIsXG4gICAgICAgIFwibWludXRlc3NlY29uZHNcIixcbiAgICAgICAgXCJzZWNvbmRzbWlsbGlzZWNvbmRzXCIsXG4gICAgICAgIFwicXVhcnRlclwiLFxuICAgICAgICBcInllYXJxdWFydGVyXCIsXG4gICAgICAgIFwicXVhcnRlcm1vbnRoXCIsXG4gICAgICAgIFwieWVhcnF1YXJ0ZXJtb250aFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkJpblwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1pbmltdW0gYmluIHZhbHVlIHRvIGNvbnNpZGVyLiBJZiB1bnNwZWNpZmllZCwgdGhlIG1pbmltdW0gdmFsdWUgb2YgdGhlIHNwZWNpZmllZCBmaWVsZCBpcyB1c2VkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWF4XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1heGltdW0gYmluIHZhbHVlIHRvIGNvbnNpZGVyLiBJZiB1bnNwZWNpZmllZCwgdGhlIG1heGltdW0gdmFsdWUgb2YgdGhlIHNwZWNpZmllZCBmaWVsZCBpcyB1c2VkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFzZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBudW1iZXIgYmFzZSB0byB1c2UgZm9yIGF1dG9tYXRpYyBiaW4gZGV0ZXJtaW5hdGlvbiAoZGVmYXVsdCBpcyBiYXNlIDEwKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0ZXBcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBleGFjdCBzdGVwIHNpemUgdG8gdXNlIGJldHdlZW4gYmlucy4gSWYgcHJvdmlkZWQsIG9wdGlvbnMgc3VjaCBhcyBtYXhiaW5zIHdpbGwgYmUgaWdub3JlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0ZXBzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gYXJyYXkgb2YgYWxsb3dhYmxlIHN0ZXAgc2l6ZXMgdG8gY2hvb3NlIGZyb20uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm1pbnN0ZXBcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIG1pbmltdW0gYWxsb3dhYmxlIHN0ZXAgc2l6ZSAocGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgaW50ZWdlciB2YWx1ZXMpLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGl2XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2NhbGUgZmFjdG9ycyBpbmRpY2F0aW5nIGFsbG93YWJsZSBzdWJkaXZpc2lvbnMuIFRoZSBkZWZhdWx0IHZhbHVlIGlzIFs1LCAyXSwgd2hpY2ggaW5kaWNhdGVzIHRoYXQgZm9yIGJhc2UgMTAgbnVtYmVycyAodGhlIGRlZmF1bHQgYmFzZSksIHRoZSBtZXRob2QgbWF5IGNvbnNpZGVyIGRpdmlkaW5nIGJpbiBzaXplcyBieSA1IGFuZC9vciAyLiBGb3IgZXhhbXBsZSwgZm9yIGFuIGluaXRpYWwgc3RlcCBzaXplIG9mIDEwLCB0aGUgbWV0aG9kIGNhbiBjaGVjayBpZiBiaW4gc2l6ZXMgb2YgMiAoPSAxMC81KSwgNSAoPSAxMC8yKSwgb3IgMSAoPSAxMC8oNSoyKSkgbWlnaHQgYWxzbyBzYXRpc2Z5IHRoZSBnaXZlbiBjb25zdHJhaW50cy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibWF4Ymluc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1heGltdW0gbnVtYmVyIG9mIGJpbnMuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJDaGFubmVsRGVmV2l0aExlZ2VuZFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibGVnZW5kXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0xlZ2VuZFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVcIlxuICAgICAgICB9LFxuICAgICAgICBcInNvcnRcIjoge1xuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRGaWVsZFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRPcmRlclwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgZmllbGQgZnJvbSB3aGljaCB0byBwdWxsIGEgZGF0YSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZW5jb2RlZCBmaWVsZCdzIHR5cGUgb2YgbWVhc3VyZW1lbnQuIFRoaXMgY2FuIGJlIGVpdGhlciBhIGZ1bGwgdHlwZVxcblxcbm5hbWUgKGBcXFwicXVhbnRpdGF0aXZlXFxcImAsIGBcXFwidGVtcG9yYWxcXFwiYCwgYFxcXCJvcmRpbmFsXFxcImAsICBhbmQgYFxcXCJub21pbmFsXFxcImApXFxuXFxub3IgYW4gaW5pdGlhbCBjaGFyYWN0ZXIgb2YgdGhlIHR5cGUgbmFtZSAoYFxcXCJRXFxcImAsIGBcXFwiVFxcXCJgLCBgXFxcIk9cXFwiYCwgYFxcXCJOXFxcImApLlxcblxcblRoaXMgcHJvcGVydHkgaXMgY2FzZSBpbnNlbnNpdGl2ZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBjb25zdGFudCB2YWx1ZSBpbiB2aXN1YWwgZG9tYWluLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIGEgYHRlbXBvcmFsYCBmaWVsZCAgKGUuZy4sIGB5ZWFyYCwgYHllYXJtb250aGAsIGBtb250aGAsIGBob3VyYCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGbGFnIGZvciBiaW5uaW5nIGEgYHF1YW50aXRhdGl2ZWAgZmllbGQsIG9yIGEgYmluIHByb3BlcnR5IG9iamVjdFxcblxcbmZvciBiaW5uaW5nIHBhcmFtZXRlcnMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9CaW5cIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkJpbm5pbmcgcHJvcGVydGllcyBvciBib29sZWFuIGZsYWcgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgdG8gYmluIGRhdGEgb3Igbm90LlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImFnZ3JlZ2F0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZ2dyZWdhdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGZpZWxkXFxuXFxuKGUuZy4sIGBtZWFuYCwgYHN1bWAsIGBtZWRpYW5gLCBgbWluYCwgYG1heGAsIGBjb3VudGApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaXRsZSBmb3IgYXhpcyBvciBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJMZWdlbmRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9wdGlvbmFsIGZvcm1hdHRpbmcgcGF0dGVybiBmb3IgbGVnZW5kIGxhYmVscy4gVmVnYSB1c2VzIEQzXFxcXCdzIGZvcm1hdCBwYXR0ZXJuLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIGZvciB0aGUgbGVnZW5kLiAoU2hvd3MgZmllbGQgbmFtZSBhbmQgaXRzIGZ1bmN0aW9uIGJ5IGRlZmF1bHQuKVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRXhwbGljaXRseSBzZXQgdGhlIHZpc2libGUgbGVnZW5kIHZhbHVlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgdGhlIGxlZ2VuZC4gT25lIG9mIFxcXCJsZWZ0XFxcIiBvciBcXFwicmlnaHRcXFwiLiBUaGlzIGRldGVybWluZXMgaG93IHRoZSBsZWdlbmQgaXMgcG9zaXRpb25lZCB3aXRoaW4gdGhlIHNjZW5lLiBUaGUgZGVmYXVsdCBpcyBcXFwicmlnaHRcXFwiLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgbGVnZW5kIGZyb20gdGhlIGVkZ2Ugb2YgdGhlIGVuY2xvc2luZyBncm91cCBvciBkYXRhIHJlY3RhbmdsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGFkZGluZywgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSBsZW5nZW5kIGFuZCBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWFyZ2luXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmdpbiBhcm91bmQgdGhlIGxlZ2VuZCwgaW4gcGl4ZWxzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50SGVpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhlaWdodCBvZiB0aGUgZ3JhZGllbnQsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50V2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGFsaWdubWVudCBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgbGVmdCwgbWlkZGxlIG9yIHJpZ2h0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxCYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwb3NpdGlvbiBvZiB0aGUgYmFzZWxpbmUgb2YgbGVnZW5kIGxhYmVsLCBjYW4gYmUgdG9wLCBtaWRkbGUgb3IgYm90dG9tLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIGxlbmdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiBsZW5nZW5kIGxhYmxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IG9mIHRoZSBsZWdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIG5hbWVzIGFuZCB3ZWVrZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIHN5bWJvbCxcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFNoYXBlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNoYXBlIG9mIHRoZSBsZWdlbmQgc3ltYm9sLCBjYW4gYmUgdGhlICdjaXJjbGUnLCAnc3F1YXJlJywgJ2Nyb3NzJywgJ2RpYW1vbmQnLFxcblxcbid0cmlhbmdsZS11cCcsICd0cmlhbmdsZS1kb3duJywgb3IgZWxzZSBhIGN1c3RvbSBTVkcgcGF0aCBzdHJpbmcuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUgb2YgdGhlIGxlbmdlbmQgc3ltYm9sLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgc3ltYm9sJ3Mgc3Ryb2tlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cXG5cXG5UaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgd2VpZ2h0IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGxlZ2VuZCBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmllbGREZWZcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgZmllbGQgZnJvbSB3aGljaCB0byBwdWxsIGEgZGF0YSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZW5jb2RlZCBmaWVsZCdzIHR5cGUgb2YgbWVhc3VyZW1lbnQuIFRoaXMgY2FuIGJlIGVpdGhlciBhIGZ1bGwgdHlwZVxcblxcbm5hbWUgKGBcXFwicXVhbnRpdGF0aXZlXFxcImAsIGBcXFwidGVtcG9yYWxcXFwiYCwgYFxcXCJvcmRpbmFsXFxcImAsICBhbmQgYFxcXCJub21pbmFsXFxcImApXFxuXFxub3IgYW4gaW5pdGlhbCBjaGFyYWN0ZXIgb2YgdGhlIHR5cGUgbmFtZSAoYFxcXCJRXFxcImAsIGBcXFwiVFxcXCJgLCBgXFxcIk9cXFwiYCwgYFxcXCJOXFxcImApLlxcblxcblRoaXMgcHJvcGVydHkgaXMgY2FzZSBpbnNlbnNpdGl2ZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBjb25zdGFudCB2YWx1ZSBpbiB2aXN1YWwgZG9tYWluLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIGEgYHRlbXBvcmFsYCBmaWVsZCAgKGUuZy4sIGB5ZWFyYCwgYHllYXJtb250aGAsIGBtb250aGAsIGBob3VyYCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGbGFnIGZvciBiaW5uaW5nIGEgYHF1YW50aXRhdGl2ZWAgZmllbGQsIG9yIGEgYmluIHByb3BlcnR5IG9iamVjdFxcblxcbmZvciBiaW5uaW5nIHBhcmFtZXRlcnMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9CaW5cIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkJpbm5pbmcgcHJvcGVydGllcyBvciBib29sZWFuIGZsYWcgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgdG8gYmluIGRhdGEgb3Igbm90LlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImFnZ3JlZ2F0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZ2dyZWdhdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGZpZWxkXFxuXFxuKGUuZy4sIGBtZWFuYCwgYHN1bWAsIGBtZWRpYW5gLCBgbWluYCwgYG1heGAsIGBjb3VudGApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaXRsZSBmb3IgYXhpcyBvciBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJPcmRlckNoYW5uZWxEZWZcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInNvcnRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydE9yZGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRGF0YVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZm9ybWF0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFGb3JtYXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIHRoZSBmb3JtYXQgZm9yIHRoZSBkYXRhIGZpbGUgb3IgdmFsdWVzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXJsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBVUkwgZnJvbSB3aGljaCB0byBsb2FkIHRoZSBkYXRhIHNldC4gVXNlIHRoZSBmb3JtYXQudHlwZSBwcm9wZXJ0eVxcblxcbnRvIGVuc3VyZSB0aGUgbG9hZGVkIGRhdGEgaXMgY29ycmVjdGx5IHBhcnNlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBhc3MgYXJyYXkgb2Ygb2JqZWN0cyBpbnN0ZWFkIG9mIGEgdXJsIHRvIGEgZmlsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge31cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJEYXRhRm9ybWF0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFGb3JtYXRUeXBlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlR5cGUgb2YgaW5wdXQgZGF0YTogYFxcXCJqc29uXFxcImAsIGBcXFwiY3N2XFxcImAsIGBcXFwidHN2XFxcImAuXFxuXFxuVGhlIGRlZmF1bHQgZm9ybWF0IHR5cGUgaXMgZGV0ZXJtaW5lZCBieSB0aGUgZXh0ZW5zaW9uIG9mIHRoZSBmaWxlIHVybC5cXG5cXG5JZiBubyBleHRlbnNpb24gaXMgZGV0ZWN0ZWQsIGBcXFwianNvblxcXCJgIHdpbGwgYmUgdXNlZCBieSBkZWZhdWx0LlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJKU09OIG9ubHkpIFRoZSBKU09OIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGRlc2lyZWQgZGF0YS5cXG5cXG5UaGlzIHBhcmFtZXRlciBjYW4gYmUgdXNlZCB3aGVuIHRoZSBsb2FkZWQgSlNPTiBmaWxlIG1heSBoYXZlIHN1cnJvdW5kaW5nIHN0cnVjdHVyZSBvciBtZXRhLWRhdGEuXFxuXFxuRm9yIGV4YW1wbGUgYFxcXCJwcm9wZXJ0eVxcXCI6IFxcXCJ2YWx1ZXMuZmVhdHVyZXNcXFwiYCBpcyBlcXVpdmFsZW50IHRvIHJldHJpZXZpbmcgYGpzb24udmFsdWVzLmZlYXR1cmVzYFxcblxcbmZyb20gdGhlIGxvYWRlZCBKU09OIG9iamVjdC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZlYXR1cmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbmFtZSBvZiB0aGUgVG9wb0pTT04gb2JqZWN0IHNldCB0byBjb252ZXJ0IHRvIGEgR2VvSlNPTiBmZWF0dXJlIGNvbGxlY3Rpb24uXFxuXFxuRm9yIGV4YW1wbGUsIGluIGEgbWFwIG9mIHRoZSB3b3JsZCwgdGhlcmUgbWF5IGJlIGFuIG9iamVjdCBzZXQgbmFtZWQgYFxcXCJjb3VudHJpZXNcXFwiYC5cXG5cXG5Vc2luZyB0aGUgZmVhdHVyZSBwcm9wZXJ0eSwgd2UgY2FuIGV4dHJhY3QgdGhpcyBzZXQgYW5kIGdlbmVyYXRlIGEgR2VvSlNPTiBmZWF0dXJlIG9iamVjdCBmb3IgZWFjaCBjb3VudHJ5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBuYW1lIG9mIHRoZSBUb3BvSlNPTiBvYmplY3Qgc2V0IHRvIGNvbnZlcnQgdG8gYSBtZXNoLlxcblxcblNpbWlsYXIgdG8gdGhlIGBmZWF0dXJlYCBvcHRpb24sIGBtZXNoYCBleHRyYWN0cyBhIG5hbWVkIFRvcG9KU09OIG9iamVjdCBzZXQuXFxuXFxuVW5saWtlIHRoZSBgZmVhdHVyZWAgb3B0aW9uLCB0aGUgY29ycmVzcG9uZGluZyBnZW8gZGF0YSBpcyByZXR1cm5lZCBhcyBhIHNpbmdsZSwgdW5pZmllZCBtZXNoIGluc3RhbmNlLCBub3QgYXMgaW5pZGl2aWR1YWwgR2VvSlNPTiBmZWF0dXJlcy5cXG5cXG5FeHRyYWN0aW5nIGEgbWVzaCBpcyB1c2VmdWwgZm9yIG1vcmUgZWZmaWNpZW50bHkgZHJhd2luZyBib3JkZXJzIG9yIG90aGVyIGdlb2dyYXBoaWMgZWxlbWVudHMgdGhhdCB5b3UgZG8gbm90IG5lZWQgdG8gYXNzb2NpYXRlIHdpdGggc3BlY2lmaWMgcmVnaW9ucyBzdWNoIGFzIGluZGl2aWR1YWwgY291bnRyaWVzLCBzdGF0ZXMgb3IgY291bnRpZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJEYXRhRm9ybWF0VHlwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwianNvblwiLFxuICAgICAgICBcImNzdlwiLFxuICAgICAgICBcInRzdlwiLFxuICAgICAgICBcInRvcG9qc29uXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVHJhbnNmb3JtXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWx0ZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHN0cmluZyBjb250YWluaW5nIHRoZSBmaWx0ZXIgVmVnYSBleHByZXNzaW9uLiBVc2UgYGRhdHVtYCB0byByZWZlciB0byB0aGUgY3VycmVudCBkYXRhIG9iamVjdC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRXF1YWxGaWx0ZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9SYW5nZUZpbHRlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0luRmlsdGVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9FcXVhbEZpbHRlclwiXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1JhbmdlRmlsdGVyXCJcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvSW5GaWx0ZXJcIlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWx0ZXJJbnZhbGlkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciB0byBmaWx0ZXIgaW52YWxpZCB2YWx1ZXMgKGBudWxsYCBhbmQgYE5hTmApIGZyb20gdGhlIGRhdGEuIEJ5IGRlZmF1bHQgKGB1bmRlZmluZWRgKSwgb25seSBxdWFudGl0YXRpdmUgYW5kIHRlbXBvcmFsIGZpZWxkcyBhcmUgZmlsdGVyZWQuIElmIHNldCB0byBgdHJ1ZWAsIGFsbCBkYXRhIGl0ZW1zIHdpdGggbnVsbCB2YWx1ZXMgYXJlIGZpbHRlcmVkLiBJZiBgZmFsc2VgLCBhbGwgZGF0YSBpdGVtcyBhcmUgaW5jbHVkZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2FsY3VsYXRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2FsY3VsYXRlIG5ldyBmaWVsZChzKSB1c2luZyB0aGUgcHJvdmlkZWQgZXhwcmVzc3Npb24ocykuIENhbGN1bGF0aW9uIGFyZSBhcHBsaWVkIGJlZm9yZSBmaWx0ZXIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRm9ybXVsYVwiLFxuICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZvcm11bGEgb2JqZWN0IGZvciBjYWxjdWxhdGUuXCJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRXF1YWxGaWx0ZXJcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpbWUgdW5pdCBmb3IgdGhlIGZpZWxkIHRvIGJlIGZpbHRlcmVkLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGaWVsZCB0byBiZSBmaWx0ZXJlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImVxdWFsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVmFsdWUgdGhhdCB0aGUgZmllbGQgc2hvdWxkIGJlIGVxdWFsIHRvLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRlVGltZVwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT2JqZWN0IGZvciBkZWZpbmluZyBkYXRldGltZSBpbiBWZWdhLUxpdGUgRmlsdGVyLlxcblxcbklmIGJvdGggbW9udGggYW5kIHF1YXJ0ZXIgYXJlIHByb3ZpZGVkLCBtb250aCBoYXMgaGlnaGVyIHByZWNlZGVuY2UuXFxuXFxuYGRheWAgY2Fubm90IGJlIGNvbWJpbmVkIHdpdGggb3RoZXIgZGF0ZS5cXG5cXG5XZSBhY2NlcHQgc3RyaW5nIGZvciBtb250aCBhbmQgZGF5IG5hbWVzLlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmllbGRcIixcbiAgICAgICAgXCJlcXVhbFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkRhdGVUaW1lXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ5ZWFyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIHllYXIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJxdWFydGVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIHF1YXJ0ZXIgb2YgdGhlIHllYXIgKGZyb20gMS00KS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1vbnRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT25lIG9mOiAoMSkgaW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIG1vbnRoIGZyb20gYDFgLWAxMmAuIGAxYCByZXByZXNlbnRzIEphbnVhcnk7ICAoMikgY2FzZS1pbnNlbnNpdGl2ZSBtb250aCBuYW1lIChlLmcuLCBgXFxcIkphbnVhcnlcXFwiYCk7ICAoMykgY2FzZS1pbnNlbnNpdGl2ZSwgMy1jaGFyYWN0ZXIgc2hvcnQgbW9udGggbmFtZSAoZS5nLiwgYFxcXCJKYW5cXFwiYCkuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIGRhdGUgZnJvbSAxLTMxLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVmFsdWUgcmVwcmVzZW50aW5nIHRoZSBkYXkgb2Ygd2Vlay4gIFRoaXMgY2FuIGJlIG9uZSBvZjogKDEpIGludGVnZXIgdmFsdWUgLS0gYDFgIHJlcHJlc2VudHMgTW9uZGF5OyAoMikgY2FzZS1pbnNlbnNpdGl2ZSBkYXkgbmFtZSAoZS5nLiwgYFxcXCJNb25kYXlcXFwiYCk7ICAoMykgY2FzZS1pbnNlbnNpdGl2ZSwgMy1jaGFyYWN0ZXIgc2hvcnQgZGF5IG5hbWUgKGUuZy4sIGBcXFwiTW9uXFxcImApLiAgIDxici8+ICoqV2FybmluZzoqKiBBIERhdGVUaW1lIGRlZmluaXRpb24gb2JqZWN0IHdpdGggYGRheWAqKiBzaG91bGQgbm90IGJlIGNvbWJpbmVkIHdpdGggYHllYXJgLCBgcXVhcnRlcmAsIGBtb250aGAsIG9yIGBkYXRlYC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImhvdXJzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIGhvdXIgb2YgZGF5IGZyb20gMC0yMy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1pbnV0ZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyBtaW51dGUgc2VnbWVudCBvZiBhIHRpbWUgZnJvbSAwLTU5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2Vjb25kc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHNlY29uZCBzZWdtZW50IG9mIGEgdGltZSBmcm9tIDAtNTkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtaWxsaXNlY29uZHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyBtaWxsaXNlY29uZCBzZWdtZW50IG9mIGEgdGltZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlJhbmdlRmlsdGVyXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJ0aW1lIHVuaXQgZm9yIHRoZSBmaWVsZCB0byBiZSBmaWx0ZXJlZC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmllbGQgdG8gYmUgZmlsdGVyZWRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXJyYXkgb2YgaW5jbHVzaXZlIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWVzXFxuXFxuZm9yIGEgZmllbGQgdmFsdWUgb2YgYSBkYXRhIGl0ZW0gdG8gYmUgaW5jbHVkZWQgaW4gdGhlIGZpbHRlcmVkIGRhdGEuXCIsXG4gICAgICAgICAgXCJtYXhJdGVtc1wiOiAyLFxuICAgICAgICAgIFwibWluSXRlbXNcIjogMixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRlVGltZVwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPYmplY3QgZm9yIGRlZmluaW5nIGRhdGV0aW1lIGluIFZlZ2EtTGl0ZSBGaWx0ZXIuXFxuXFxuSWYgYm90aCBtb250aCBhbmQgcXVhcnRlciBhcmUgcHJvdmlkZWQsIG1vbnRoIGhhcyBoaWdoZXIgcHJlY2VkZW5jZS5cXG5cXG5gZGF5YCBjYW5ub3QgYmUgY29tYmluZWQgd2l0aCBvdGhlciBkYXRlLlxcblxcbldlIGFjY2VwdCBzdHJpbmcgZm9yIG1vbnRoIGFuZCBkYXkgbmFtZXMuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwicmFuZ2VcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJJbkZpbHRlclwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwidGltZSB1bml0IGZvciB0aGUgZmllbGQgdG8gYmUgZmlsdGVyZWQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZpZWxkIHRvIGJlIGZpbHRlcmVkXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc2V0IG9mIHZhbHVlcyB0aGF0IHRoZSBgZmllbGRgJ3MgdmFsdWUgc2hvdWxkIGJlIGEgbWVtYmVyIG9mLFxcblxcbmZvciBhIGRhdGEgaXRlbSBpbmNsdWRlZCBpbiB0aGUgZmlsdGVyZWQgZGF0YS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRlVGltZVwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPYmplY3QgZm9yIGRlZmluaW5nIGRhdGV0aW1lIGluIFZlZ2EtTGl0ZSBGaWx0ZXIuXFxuXFxuSWYgYm90aCBtb250aCBhbmQgcXVhcnRlciBhcmUgcHJvdmlkZWQsIG1vbnRoIGhhcyBoaWdoZXIgcHJlY2VkZW5jZS5cXG5cXG5gZGF5YCBjYW5ub3QgYmUgY29tYmluZWQgd2l0aCBvdGhlciBkYXRlLlxcblxcbldlIGFjY2VwdCBzdHJpbmcgZm9yIG1vbnRoIGFuZCBkYXkgbmFtZXMuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwiaW5cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJGb3JtdWxhXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmaWVsZCBpbiB3aGljaCB0byBzdG9yZSB0aGUgY29tcHV0ZWQgZm9ybXVsYSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImV4cHJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHN0cmluZyBjb250YWluaW5nIGFuIGV4cHJlc3Npb24gZm9yIHRoZSBmb3JtdWxhLiBVc2UgdGhlIHZhcmlhYmxlIGBkYXR1bWAgdG8gdG8gcmVmZXIgdG8gdGhlIGN1cnJlbnQgZGF0YSBvYmplY3QuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwiZXhwclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkNvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidmlld3BvcnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggYW5kIGhlaWdodCBvZiB0aGUgb24tc2NyZWVuIHZpZXdwb3J0LCBpbiBwaXhlbHMuIElmIG5lY2Vzc2FyeSwgY2xpcHBpbmcgYW5kIHNjcm9sbGluZyB3aWxsIGJlIGFwcGxpZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYWNrZ3JvdW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ1NTIGNvbG9yIHByb3BlcnR5IHRvIHVzZSBhcyBiYWNrZ3JvdW5kIG9mIHZpc3VhbGl6YXRpb24uIERlZmF1bHQgaXMgYFxcXCJ0cmFuc3BhcmVudFxcXCJgLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibnVtYmVyRm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRDMgTnVtYmVyIGZvcm1hdCBmb3IgYXhpcyBsYWJlbHMgYW5kIHRleHQgdGFibGVzLiBGb3IgZXhhbXBsZSBcXFwic1xcXCIgZm9yIFNJIHVuaXRzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZUZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgZGF0ZXRpbWUgZm9ybWF0IGZvciBheGlzIGFuZCBsZWdlbmQgbGFiZWxzLiBUaGUgZm9ybWF0IGNhbiBiZSBzZXQgZGlyZWN0bHkgb24gZWFjaCBheGlzIGFuZCBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb3VudFRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBheGlzIGFuZCBsZWdlbmQgdGl0bGUgZm9yIGNvdW50IGZpZWxkcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImNlbGxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2VsbENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDZWxsIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWFya1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1hcmsgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvdmVybGF5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL092ZXJsYXlDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTWFyayBPdmVybGF5IENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2NhbGUgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXhpcyBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxlZ2VuZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MZWdlbmRDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTGVnZW5kIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmFjZXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgQ29uZmlnXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJDZWxsQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ3aWR0aFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJoZWlnaHRcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2xpcFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmaWxsIGNvbG9yLlwiLFxuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZpbGxPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZpbGwgb3BhY2l0eSAodmFsdWUgYmV0d2VlbiBbMCwxXSkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIGNvbG9yLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2Ugb3BhY2l0eSAodmFsdWUgYmV0d2VlbiBbMCwxXSkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2Ugd2lkdGgsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZURhc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBhcnJheSBvZiBhbHRlcm5hdGluZyBzdHJva2UsIHNwYWNlIGxlbmd0aHMgZm9yIGNyZWF0aW5nIGRhc2hlZCBvciBkb3R0ZWQgbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZURhc2hPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IChpbiBwaXhlbHMpIGludG8gd2hpY2ggdG8gYmVnaW4gZHJhd2luZyB3aXRoIHRoZSBzdHJva2UgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIk1hcmtDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpbGxlZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgdGhlIHNoYXBlXFxcXCdzIGNvbG9yIHNob3VsZCBiZSB1c2VkIGFzIGZpbGwgY29sb3IgaW5zdGVhZCBvZiBzdHJva2UgY29sb3IuXFxuXFxuVGhpcyBpcyBvbmx5IGFwcGxpY2FibGUgZm9yIFxcXCJiYXJcXFwiLCBcXFwicG9pbnRcXFwiLCBhbmQgXFxcImFyZWFcXFwiLlxcblxcbkFsbCBtYXJrcyBleGNlcHQgXFxcInBvaW50XFxcIiBtYXJrcyBhcmUgZmlsbGVkIGJ5IGRlZmF1bHQuXFxuXFxuU2VlIE1hcmsgRG9jdW1lbnRhdGlvbiAoaHR0cDovL3ZlZ2EuZ2l0aHViLmlvL3ZlZ2EtbGl0ZS9kb2NzL21hcmtzLmh0bWwpXFxuXFxuZm9yIHVzYWdlIGV4YW1wbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGNvbG9yLlwiLFxuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZpbGxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IEZpbGwgQ29sb3IuICBUaGlzIGhhcyBoaWdoZXIgcHJlY2VkZW5jZSB0aGFuIGNvbmZpZy5jb2xvclwiLFxuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgU3Ryb2tlIENvbG9yLiAgVGhpcyBoYXMgaGlnaGVyIHByZWNlZGVuY2UgdGhhbiBjb25maWcuY29sb3JcIixcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcIm1heGltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZpbGxPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcIm1heGltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZU9wYWNpdHlcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwibWF4aW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIGFycmF5IG9mIGFsdGVybmF0aW5nIHN0cm9rZSwgc3BhY2UgbGVuZ3RocyBmb3IgY3JlYXRpbmcgZGFzaGVkIG9yIGRvdHRlZCBsaW5lcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlRGFzaE9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIHN0cm9rZSBkYXNoIGFycmF5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3RhY2tlZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TdGFja09mZnNldFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yaWVudFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgYSBub24tc3RhY2tlZCBiYXIsIHRpY2ssIGFyZWEsIGFuZCBsaW5lIGNoYXJ0cy5cXG5cXG5UaGUgdmFsdWUgaXMgZWl0aGVyIGhvcml6b250YWwgKGRlZmF1bHQpIG9yIHZlcnRpY2FsLlxcblxcbi0gRm9yIGJhciwgcnVsZSBhbmQgdGljaywgdGhpcyBkZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNpemUgb2YgdGhlIGJhciBhbmQgdGlja1xcblxcbnNob3VsZCBiZSBhcHBsaWVkIHRvIHggb3IgeSBkaW1lbnNpb24uXFxuXFxuLSBGb3IgYXJlYSwgdGhpcyBwcm9wZXJ0eSBkZXRlcm1pbmVzIHRoZSBvcmllbnQgcHJvcGVydHkgb2YgdGhlIFZlZ2Egb3V0cHV0Llxcblxcbi0gRm9yIGxpbmUsIHRoaXMgcHJvcGVydHkgZGV0ZXJtaW5lcyB0aGUgc29ydCBvcmRlciBvZiB0aGUgcG9pbnRzIGluIHRoZSBsaW5lXFxuXFxuaWYgYGNvbmZpZy5zb3J0TGluZUJ5YCBpcyBub3Qgc3BlY2lmaWVkLlxcblxcbkZvciBzdGFja2VkIGNoYXJ0cywgdGhpcyBpcyBhbHdheXMgZGV0ZXJtaW5lZCBieSB0aGUgb3JpZW50YXRpb24gb2YgdGhlIHN0YWNrO1xcblxcbnRoZXJlZm9yZSBleHBsaWNpdGx5IHNwZWNpZmllZCB2YWx1ZSB3aWxsIGJlIGlnbm9yZWQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJpbnRlcnBvbGF0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9JbnRlcnBvbGF0ZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbGluZSBpbnRlcnBvbGF0aW9uIG1ldGhvZCB0byB1c2UuIE9uZSBvZiBsaW5lYXIsIHN0ZXAtYmVmb3JlLCBzdGVwLWFmdGVyLCBiYXNpcywgYmFzaXMtb3BlbiwgY2FyZGluYWwsIGNhcmRpbmFsLW9wZW4sIG1vbm90b25lLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGVuc2lvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlcGVuZGluZyBvbiB0aGUgaW50ZXJwb2xhdGlvbiB0eXBlLCBzZXRzIHRoZSB0ZW5zaW9uIHBhcmFtZXRlci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxpbmVTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiBsaW5lIG1hcmsuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJydWxlU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgcnVsZSBtYXJrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFyU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBiYXJzLiAgSWYgdW5zcGVjaWZpZWQsIHRoZSBkZWZhdWx0IHNpemUgaXMgIGBiYW5kU2l6ZS0xYCxcXG5cXG53aGljaCBwcm92aWRlcyAxIHBpeGVsIG9mZnNldCBiZXR3ZWVuIGJhcnMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXJUaGluU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBiYXJzIG9uIGNvbnRpbnVvdXMgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hhcGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3ltYm9sIHNoYXBlIHRvIHVzZS4gT25lIG9mIGNpcmNsZSAoZGVmYXVsdCksIHNxdWFyZSwgY3Jvc3MsIGRpYW1vbmQsIHRyaWFuZ2xlLXVwLCBvciB0cmlhbmdsZS1kb3duLCBvciBhIGN1c3RvbSBTVkcgcGF0aC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TaGFwZVwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBpeGVsIGFyZWEgZWFjaCB0aGUgcG9pbnQuIEZvciBleGFtcGxlOiBpbiB0aGUgY2FzZSBvZiBjaXJjbGVzLCB0aGUgcmFkaXVzIGlzIGRldGVybWluZWQgaW4gcGFydCBieSB0aGUgc3F1YXJlIHJvb3Qgb2YgdGhlIHNpemUgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgdGlja3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrVGhpY2tuZXNzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhpY2tuZXNzIG9mIHRoZSB0aWNrIG1hcmsuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhbGlnblwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Ib3Jpem9udGFsQWxpZ25cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhvcml6b250YWwgYWxpZ25tZW50IG9mIHRoZSB0ZXh0LiBPbmUgb2YgbGVmdCwgcmlnaHQsIGNlbnRlci5cIlxuICAgICAgICB9LFxuICAgICAgICBcImFuZ2xlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHJvdGF0aW9uIGFuZ2xlIG9mIHRoZSB0ZXh0LCBpbiBkZWdyZWVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVmVydGljYWxBbGlnblwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdmVydGljYWwgYWxpZ25tZW50IG9mIHRoZSB0ZXh0LiBPbmUgb2YgdG9wLCBtaWRkbGUsIGJvdHRvbS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImR4XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhvcml6b250YWwgb2Zmc2V0LCBpbiBwaXhlbHMsIGJldHdlZW4gdGhlIHRleHQgbGFiZWwgYW5kIGl0cyBhbmNob3IgcG9pbnQuIFRoZSBvZmZzZXQgaXMgYXBwbGllZCBhZnRlciByb3RhdGlvbiBieSB0aGUgYW5nbGUgcHJvcGVydHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkeVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB2ZXJ0aWNhbCBvZmZzZXQsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgdGV4dCBsYWJlbCBhbmQgaXRzIGFuY2hvciBwb2ludC4gVGhlIG9mZnNldCBpcyBhcHBsaWVkIGFmdGVyIHJvdGF0aW9uIGJ5IHRoZSBhbmdsZSBwcm9wZXJ0eS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInJhZGl1c1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBvbGFyIGNvb3JkaW5hdGUgcmFkaWFsIG9mZnNldCwgaW4gcGl4ZWxzLCBvZiB0aGUgdGV4dCBsYWJlbCBmcm9tIHRoZSBvcmlnaW4gZGV0ZXJtaW5lZCBieSB0aGUgeCBhbmQgeSBwcm9wZXJ0aWVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGhldGFcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQb2xhciBjb29yZGluYXRlIGFuZ2xlLCBpbiByYWRpYW5zLCBvZiB0aGUgdGV4dCBsYWJlbCBmcm9tIHRoZSBvcmlnaW4gZGV0ZXJtaW5lZCBieSB0aGUgeCBhbmQgeSBwcm9wZXJ0aWVzLiBWYWx1ZXMgZm9yIHRoZXRhIGZvbGxvdyB0aGUgc2FtZSBjb252ZW50aW9uIG9mIGFyYyBtYXJrIHN0YXJ0QW5nbGUgYW5kIGVuZEFuZ2xlIHByb3BlcnRpZXM6IGFuZ2xlcyBhcmUgbWVhc3VyZWQgaW4gcmFkaWFucywgd2l0aCAwIGluZGljYXRpbmcgXFxcIm5vcnRoXFxcIi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdHlwZWZhY2UgdG8gc2V0IHRoZSB0ZXh0IGluIChlLmcuLCBIZWx2ZXRpY2EgTmV1ZSkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRTdHlsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Gb250U3R5bGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc3R5bGUgKGUuZy4sIGl0YWxpYykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZvbnRXZWlnaHRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgd2VpZ2h0IChlLmcuLCBib2xkKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIHRleHQgdmFsdWUuIElmIG5vdCBkZWZpbmVkLCB0aGlzIHdpbGwgYmUgZGV0ZXJtaW5lZCBhdXRvbWF0aWNhbGx5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBuYW1lcyBhbmQgd2Vla2RheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGV4dFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBsYWNlaG9sZGVyIFRleHRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImFwcGx5Q29sb3JUb0JhY2tncm91bmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBcHBseSBjb2xvciBmaWVsZCB0byBiYWNrZ3JvdW5kIGNvbG9yIGluc3RlYWQgb2YgdGhlIHRleHQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiU3RhY2tPZmZzZXRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInplcm9cIixcbiAgICAgICAgXCJjZW50ZXJcIixcbiAgICAgICAgXCJub3JtYWxpemVcIixcbiAgICAgICAgXCJub25lXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiT3JpZW50XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJob3Jpem9udGFsXCIsXG4gICAgICAgIFwidmVydGljYWxcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJJbnRlcnBvbGF0ZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibGluZWFyXCIsXG4gICAgICAgIFwibGluZWFyLWNsb3NlZFwiLFxuICAgICAgICBcInN0ZXBcIixcbiAgICAgICAgXCJzdGVwLWJlZm9yZVwiLFxuICAgICAgICBcInN0ZXAtYWZ0ZXJcIixcbiAgICAgICAgXCJiYXNpc1wiLFxuICAgICAgICBcImJhc2lzLW9wZW5cIixcbiAgICAgICAgXCJiYXNpcy1jbG9zZWRcIixcbiAgICAgICAgXCJjYXJkaW5hbFwiLFxuICAgICAgICBcImNhcmRpbmFsLW9wZW5cIixcbiAgICAgICAgXCJjYXJkaW5hbC1jbG9zZWRcIixcbiAgICAgICAgXCJidW5kbGVcIixcbiAgICAgICAgXCJtb25vdG9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNoYXBlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJjaXJjbGVcIixcbiAgICAgICAgXCJzcXVhcmVcIixcbiAgICAgICAgXCJjcm9zc1wiLFxuICAgICAgICBcImRpYW1vbmRcIixcbiAgICAgICAgXCJ0cmlhbmdsZS11cFwiLFxuICAgICAgICBcInRyaWFuZ2xlLWRvd25cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJIb3Jpem9udGFsQWxpZ25cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxlZnRcIixcbiAgICAgICAgXCJyaWdodFwiLFxuICAgICAgICBcImNlbnRlclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlZlcnRpY2FsQWxpZ25cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInRvcFwiLFxuICAgICAgICBcIm1pZGRsZVwiLFxuICAgICAgICBcImJvdHRvbVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkZvbnRTdHlsZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibm9ybWFsXCIsXG4gICAgICAgIFwiaXRhbGljXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRm9udFdlaWdodFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibm9ybWFsXCIsXG4gICAgICAgIFwiYm9sZFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk92ZXJsYXlDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIHRvIG92ZXJsYXkgbGluZSB3aXRoIHBvaW50LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImFyZWFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXJlYU92ZXJsYXlcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVHlwZSBvZiBvdmVybGF5IGZvciBhcmVhIG1hcmsgKGxpbmUgb3IgbGluZXBvaW50KVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicG9pbnRTdHlsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgc3R5bGUgZm9yIHRoZSBvdmVybGF5ZWQgcG9pbnQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsaW5lU3R5bGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHN0eWxlIGZvciB0aGUgb3ZlcmxheWVkIHBvaW50LlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXJlYU92ZXJsYXlcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxpbmVcIixcbiAgICAgICAgXCJsaW5lcG9pbnRcIixcbiAgICAgICAgXCJub25lXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU2NhbGVDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInJvdW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgdHJ1ZSwgcm91bmRzIG51bWVyaWMgb3V0cHV0IHZhbHVlcyB0byBpbnRlZ2Vycy5cXG5cXG5UaGlzIGNhbiBiZSBoZWxwZnVsIGZvciBzbmFwcGluZyB0byB0aGUgcGl4ZWwgZ3JpZC5cXG5cXG4oT25seSBhdmFpbGFibGUgZm9yIGB4YCwgYHlgLCBgc2l6ZWAsIGByb3dgLCBhbmQgYGNvbHVtbmAgc2NhbGVzLilcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0QmFuZFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBiYW5kIHdpZHRoIGZvciBgeGAgb3JkaW5hbCBzY2FsZSB3aGVuIGlzIG1hcmsgaXMgYHRleHRgLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFuZFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGJhbmQgc2l6ZSBmb3IgKDEpIGB5YCBvcmRpbmFsIHNjYWxlLFxcblxcbmFuZCAoMikgYHhgIG9yZGluYWwgc2NhbGUgd2hlbiB0aGUgbWFyayBpcyBub3QgYHRleHRgLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIG9wYWNpdHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHBhZGRpbmcgZm9yIGB4YCBhbmQgYHlgIG9yZGluYWwgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXNlUmF3RG9tYWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVXNlcyB0aGUgc291cmNlIGRhdGEgcmFuZ2UgYXMgc2NhbGUgZG9tYWluIGluc3RlYWQgb2YgYWdncmVnYXRlZCBkYXRhIGZvciBhZ2dyZWdhdGUgYXhpcy5cXG5cXG5UaGlzIHByb3BlcnR5IG9ubHkgd29ya3Mgd2l0aCBhZ2dyZWdhdGUgZnVuY3Rpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgd2l0aGluIHRoZSByYXcgZGF0YSBkb21haW4gKGBcXFwibWVhblxcXCJgLCBgXFxcImF2ZXJhZ2VcXFwiYCwgYFxcXCJzdGRldlxcXCJgLCBgXFxcInN0ZGV2cFxcXCJgLCBgXFxcIm1lZGlhblxcXCJgLCBgXFxcInExXFxcImAsIGBcXFwicTNcXFwiYCwgYFxcXCJtaW5cXFwiYCwgYFxcXCJtYXhcXFwiYCkuIEZvciBvdGhlciBhZ2dyZWdhdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyBvdXRzaWRlIG9mIHRoZSByYXcgZGF0YSBkb21haW4gKGUuZy4gYFxcXCJjb3VudFxcXCJgLCBgXFxcInN1bVxcXCJgKSwgdGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5vbWluYWxDb2xvclJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3Igbm9taW5hbCBjb2xvciBzY2FsZVwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXF1ZW50aWFsQ29sb3JSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIG9yZGluYWwgLyBjb250aW51b3VzIGNvbG9yIHNjYWxlXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBzaGFwZVwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXJTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBiYXIgc2l6ZSBzY2FsZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250U2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgZm9udCBzaXplIHNjYWxlXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInJ1bGVTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBydWxlIHN0cm9rZSB3aWR0aHNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIHRpY2sgc3BhbnNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicG9pbnRTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBiYXIgc2l6ZSBzY2FsZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJBeGlzQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJheGlzV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaWR0aCBvZiB0aGUgYXhpcyBsaW5lXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYXllclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc3RyaW5nIGluZGljYXRpbmcgaWYgdGhlIGF4aXMgKGFuZCBhbnkgZ3JpZGxpbmVzKSBzaG91bGQgYmUgcGxhY2VkIGFib3ZlIG9yIGJlbG93IHRoZSBkYXRhIG1hcmtzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgYXhpcyBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBheGlzIGxpbmUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBmbGFnIGluZGljYXRlIGlmIGdyaWRsaW5lcyBzaG91bGQgYmUgY3JlYXRlZCBpbiBhZGRpdGlvbiB0byB0aWNrcy4gSWYgYGdyaWRgIGlzIHVuc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIFJPVyBhbmQgQ09MLiBGb3IgWCBhbmQgWSwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBxdWFudGl0YXRpdmUgYW5kIHRpbWUgZmllbGRzIGFuZCBgZmFsc2VgIG90aGVyd2lzZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBncmlkbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIGdyaWQgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIG9wYWNpdHkgb2YgZ3JpZCAodmFsdWUgYmV0d2VlbiBbMCwxXSlcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBncmlkIHdpZHRoLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJFbmFibGUgb3IgZGlzYWJsZSBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbmdsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByb3RhdGlvbiBhbmdsZSBvZiB0aGUgYXhpcyBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBhbGlnbm1lbnQgZm9yIHRoZSBMYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IGJhc2VsaW5lIGZvciB0aGUgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbE1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRydW5jYXRlIGxhYmVscyB0aGF0IGFyZSB0b28gbG9uZy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggYW5kIGRheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ViZGl2aWRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgcHJvdmlkZWQsIHNldHMgdGhlIG51bWJlciBvZiBtaW5vciB0aWNrcyBiZXR3ZWVuIG1ham9yIHRpY2tzICh0aGUgdmFsdWUgOSByZXN1bHRzIGluIGRlY2ltYWwgc3ViZGl2aXNpb24pLiBPbmx5IGFwcGxpY2FibGUgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBkZXNpcmVkIG51bWJlciBvZiB0aWNrcywgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy4gVGhlIHJlc3VsdGluZyBudW1iZXIgbWF5IGJlIGRpZmZlcmVudCBzbyB0aGF0IHZhbHVlcyBhcmUgXFxcIm5pY2VcXFwiIChtdWx0aXBsZXMgb2YgMiwgNSwgMTApIGFuZCBsaWUgd2l0aGluIHRoZSB1bmRlcmx5aW5nIHNjYWxlJ3MgcmFuZ2UuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGF4aXMncyB0aWNrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIHRpY2sgbGFiZWwsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIHRpY2sgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGFiZWwsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tQYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aWNrcyBhbmQgdGV4dCBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yLCBtaW5vciBhbmQgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNYWpvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNaW5vclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1pbm9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVFbmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBlbmQgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGgsIGluIHBpeGVscywgb2YgdGlja3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgdGhlIHRpdGxlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRm9udCBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXZWlnaHQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIG9mZnNldCB2YWx1ZSBmb3IgdGhlIGF4aXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZU1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1heCBsZW5ndGggZm9yIGF4aXMgdGl0bGUgaWYgdGhlIHRpdGxlIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGZyb20gdGhlIGZpZWxkJ3MgZGVzY3JpcHRpb24uIEJ5IGRlZmF1bHQsIHRoaXMgaXMgYXV0b21hdGljYWxseSBiYXNlZCBvbiBjZWxsIHNpemUgYW5kIGNoYXJhY3RlcldpZHRoIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2hhcmFjdGVyV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDaGFyYWN0ZXIgd2lkdGggZm9yIGF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5pbmcgdGl0bGUgbWF4IGxlbmd0aC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gYXhpcyBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGVnZW5kQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgdGhlIGxlZ2VuZC4gT25lIG9mIFxcXCJsZWZ0XFxcIiBvciBcXFwicmlnaHRcXFwiLiBUaGlzIGRldGVybWluZXMgaG93IHRoZSBsZWdlbmQgaXMgcG9zaXRpb25lZCB3aXRoaW4gdGhlIHNjZW5lLiBUaGUgZGVmYXVsdCBpcyBcXFwicmlnaHRcXFwiLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgbGVnZW5kIGZyb20gdGhlIGVkZ2Ugb2YgdGhlIGVuY2xvc2luZyBncm91cCBvciBkYXRhIHJlY3RhbmdsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGFkZGluZywgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSBsZW5nZW5kIGFuZCBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWFyZ2luXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmdpbiBhcm91bmQgdGhlIGxlZ2VuZCwgaW4gcGl4ZWxzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50SGVpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhlaWdodCBvZiB0aGUgZ3JhZGllbnQsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50V2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGFsaWdubWVudCBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgbGVmdCwgbWlkZGxlIG9yIHJpZ2h0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxCYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwb3NpdGlvbiBvZiB0aGUgYmFzZWxpbmUgb2YgbGVnZW5kIGxhYmVsLCBjYW4gYmUgdG9wLCBtaWRkbGUgb3IgYm90dG9tLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIGxlbmdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiBsZW5nZW5kIGxhYmxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IG9mIHRoZSBsZWdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIG5hbWVzIGFuZCB3ZWVrZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIHN5bWJvbCxcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFNoYXBlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNoYXBlIG9mIHRoZSBsZWdlbmQgc3ltYm9sLCBjYW4gYmUgdGhlICdjaXJjbGUnLCAnc3F1YXJlJywgJ2Nyb3NzJywgJ2RpYW1vbmQnLFxcblxcbid0cmlhbmdsZS11cCcsICd0cmlhbmdsZS1kb3duJywgb3IgZWxzZSBhIGN1c3RvbSBTVkcgcGF0aCBzdHJpbmcuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUgb2YgdGhlIGxlbmdlbmQgc3ltYm9sLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgc3ltYm9sJ3Mgc3Ryb2tlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cXG5cXG5UaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgd2VpZ2h0IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGxlZ2VuZCBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmFjZXRDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0U2NhbGVDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgU2NhbGUgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgQXhpcyBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRHcmlkQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IEdyaWQgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjZWxsXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NlbGxDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgQ2VsbCBDb25maWdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZhY2V0U2NhbGVDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInJvdW5kXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZhY2V0R3JpZENvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiY29sb3JcIjoge1xuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZhY2V0U3BlY1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmFjZXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRcIlxuICAgICAgICB9LFxuICAgICAgICBcInNwZWNcIjoge1xuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0xheWVyU3BlY1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1VuaXRTcGVjXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb25maWdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbmZpZ3VyYXRpb24gb2JqZWN0XCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZhY2V0XCIsXG4gICAgICAgIFwic3BlY1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkZhY2V0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3dcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2x1bW5cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJMYXllclNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxheWVyc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlVuaXQgc3BlY3MgdGhhdCB3aWxsIGJlIGxheWVyZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVW5pdFNwZWNcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJuYW1lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgdmlzdWFsaXphdGlvbiBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGlzIG1hcmsgZm9yIGNvbW1lbnRpbmcgcHVycG9zZS5cXG5cXG5UaGlzIHByb3BlcnR5IGhhcyBubyBlZmZlY3Qgb24gdGhlIG91dHB1dCB2aXN1YWxpemF0aW9uLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBkYXRhIHNvdXJjZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHJhbnNmb3JtXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RyYW5zZm9ybVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyBmaWx0ZXIgYW5kIG5ldyBmaWVsZCBjYWxjdWxhdGlvbi5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbmZpZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Db25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29uZmlndXJhdGlvbiBvYmplY3RcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwibGF5ZXJzXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVW5pdFNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1hcmtcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWFyayB0eXBlLlxcblxcbk9uZSBvZiBgXFxcImJhclxcXCJgLCBgXFxcImNpcmNsZVxcXCJgLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcInRpY2tcXFwiYCwgYFxcXCJsaW5lXFxcImAsXFxuXFxuYFxcXCJhcmVhXFxcImAsIGBcXFwicG9pbnRcXFwiYCwgYFxcXCJydWxlXFxcImAsIGFuZCBgXFxcInRleHRcXFwiYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImVuY29kaW5nXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1VuaXRFbmNvZGluZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGtleS12YWx1ZSBtYXBwaW5nIGJldHdlZW4gZW5jb2RpbmcgY2hhbm5lbHMgYW5kIGRlZmluaXRpb24gb2YgZmllbGRzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb25maWdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbmZpZ3VyYXRpb24gb2JqZWN0XCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcIm1hcmtcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJVbml0RW5jb2RpbmdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInhcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlggY29vcmRpbmF0ZXMgZm9yIGBwb2ludGAsIGBjaXJjbGVgLCBgc3F1YXJlYCxcXG5cXG5gbGluZWAsIGBydWxlYCwgYHRleHRgLCBhbmQgYHRpY2tgXFxuXFxuKG9yIHRvIHdpZHRoIGFuZCBoZWlnaHQgZm9yIGBiYXJgIGFuZCBgYXJlYWAgbWFya3MpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWSBjb29yZGluYXRlcyBmb3IgYHBvaW50YCwgYGNpcmNsZWAsIGBzcXVhcmVgLFxcblxcbmBsaW5lYCwgYHJ1bGVgLCBgdGV4dGAsIGFuZCBgdGlja2BcXG5cXG4ob3IgdG8gd2lkdGggYW5kIGhlaWdodCBmb3IgYGJhcmAgYW5kIGBhcmVhYCBtYXJrcykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ4MlwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWDIgY29vcmRpbmF0ZXMgZm9yIHJhbmdlZCBgYmFyYCwgYHJ1bGVgLCBgYXJlYWBcIlxuICAgICAgICB9LFxuICAgICAgICBcInkyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJZMiBjb29yZGluYXRlcyBmb3IgcmFuZ2VkIGBiYXJgLCBgcnVsZWAsIGBhcmVhYFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sb3JcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgdGhlIG1hcmtzIOKAkyBlaXRoZXIgZmlsbCBvciBzdHJva2UgY29sb3IgYmFzZWQgb24gbWFyayB0eXBlLlxcblxcbihCeSBkZWZhdWx0LCBmaWxsIGNvbG9yIGZvciBgYXJlYWAsIGBiYXJgLCBgdGlja2AsIGB0ZXh0YCwgYGNpcmNsZWAsIGFuZCBgc3F1YXJlYCAvXFxuXFxuc3Ryb2tlIGNvbG9yIGZvciBgbGluZWAgYW5kIGBwb2ludGAuKVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcGFjaXR5IG9mIHRoZSBtYXJrcyDigJMgZWl0aGVyIGNhbiBiZSBhIHZhbHVlIG9yIGluIGEgcmFuZ2UuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaXplXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgdGhlIG1hcmsuXFxuXFxuLSBGb3IgYHBvaW50YCwgYHNxdWFyZWAgYW5kIGBjaXJjbGVgXFxuXFxu4oCTIHRoZSBzeW1ib2wgc2l6ZSwgb3IgcGl4ZWwgYXJlYSBvZiB0aGUgbWFyay5cXG5cXG4tIEZvciBgYmFyYCBhbmQgYHRpY2tgIOKAkyB0aGUgYmFyIGFuZCB0aWNrJ3Mgc2l6ZS5cXG5cXG4tIEZvciBgdGV4dGAg4oCTIHRoZSB0ZXh0J3MgZm9udCBzaXplLlxcblxcbi0gU2l6ZSBpcyBjdXJyZW50bHkgdW5zdXBwb3J0ZWQgZm9yIGBsaW5lYCBhbmQgYGFyZWFgLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hhcGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN5bWJvbCdzIHNoYXBlIChvbmx5IGZvciBgcG9pbnRgIG1hcmtzKS4gVGhlIHN1cHBvcnRlZCB2YWx1ZXMgYXJlXFxuXFxuYFxcXCJjaXJjbGVcXFwiYCAoZGVmYXVsdCksIGBcXFwic3F1YXJlXFxcImAsIGBcXFwiY3Jvc3NcXFwiYCwgYFxcXCJkaWFtb25kXFxcImAsIGBcXFwidHJpYW5nbGUtdXBcXFwiYCxcXG5cXG5vciBgXFxcInRyaWFuZ2xlLWRvd25cXFwiYCwgb3IgZWxzZSBhIGN1c3RvbSBTVkcgcGF0aCBzdHJpbmcuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXRhaWxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZGRpdGlvbmFsIGxldmVscyBvZiBkZXRhaWwgZm9yIGdyb3VwaW5nIGRhdGEgaW4gYWdncmVnYXRlIHZpZXdzIGFuZFxcblxcbmluIGxpbmUgYW5kIGFyZWEgbWFya3Mgd2l0aG91dCBtYXBwaW5nIGRhdGEgdG8gYSBzcGVjaWZpYyB2aXN1YWwgY2hhbm5lbC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZXJmYWNlIGZvciBhbnkga2luZCBvZiBGaWVsZERlZjtcXG5cXG5Gb3Igc2ltcGxpY2l0eSwgd2UgZG8gbm90IGRlY2xhcmUgbXVsdGlwbGUgaW50ZXJmYWNlcyBvZiBGaWVsZERlZiBsaWtlXFxuXFxud2UgZG8gZm9yIEpTT04gc2NoZW1hLlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRleHRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBvZiB0aGUgYHRleHRgIG1hcmsuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGF0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9yZGVyIG9mIGRhdGEgcG9pbnRzIGluIGxpbmUgbWFya3MuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmRlclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkxheWVyIG9yZGVyIGZvciBub24tc3RhY2tlZCBtYXJrcywgb3Igc3RhY2sgb3JkZXIgZm9yIHN0YWNrZWQgbWFya3MuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCIkc2NoZW1hXCI6IFwiaHR0cDovL2pzb24tc2NoZW1hLm9yZy9kcmFmdC0wNC9zY2hlbWEjXCJcbn07IiwiJ3VzZSBzdHJpY3QnO1xuLyogZ2xvYmFscyB3aW5kb3csIGFuZ3VsYXIgKi9cblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknLCBbXG4gICAgJ0xvY2FsU3RvcmFnZU1vZHVsZScsXG4gICAgJ2FuZ3VsYXItZ29vZ2xlLWFuYWx5dGljcycsXG4gICAgJ2FuZ3VsYXItc29ydGFibGUtdmlldycsXG4gICAgJ2FuZ3VsYXItd2Vic3FsJ1xuICBdKVxuICAuY29uc3RhbnQoJ18nLCB3aW5kb3cuXylcbiAgLy8gZGF0YWxpYiwgdmVnYWxpdGUsIHZlZ2FcbiAgLmNvbnN0YW50KCd2bCcsIHdpbmRvdy52bClcbiAgLmNvbnN0YW50KCdjcWwnLCB3aW5kb3cuY3FsKVxuICAuY29uc3RhbnQoJ3ZsU2NoZW1hJywgd2luZG93LnZsU2NoZW1hKVxuICAuY29uc3RhbnQoJ3ZnJywgd2luZG93LnZnKVxuICAuY29uc3RhbnQoJ3V0aWwnLCB3aW5kb3cudmcudXRpbClcbiAgLy8gb3RoZXIgbGlicmFyaWVzXG4gIC5jb25zdGFudCgnalF1ZXJ5Jywgd2luZG93LiQpXG4gIC5jb25zdGFudCgnUGFwYScsIHdpbmRvdy5QYXBhKVxuICAuY29uc3RhbnQoJ0Jsb2InLCB3aW5kb3cuQmxvYilcbiAgLmNvbnN0YW50KCdVUkwnLCB3aW5kb3cuVVJMKVxuICAuY29uc3RhbnQoJ0Ryb3AnLCB3aW5kb3cuRHJvcClcbiAgLmNvbnN0YW50KCdIZWFwJywgd2luZG93LkhlYXApXG4gIC8vIFVzZSB0aGUgY3VzdG9taXplZCB2ZW5kb3IvanNvbjMtY29tcGFjdHN0cmluZ2lmeVxuICAuY29uc3RhbnQoJ0pTT04zJywgd2luZG93LkpTT04zLm5vQ29uZmxpY3QoKSlcbiAgLmNvbnN0YW50KCdBTlknLCAnX19BTllfXycpXG4gIC8vIGNvbnN0YW50c1xuICAuY29uc3RhbnQoJ2NvbnN0cycsIHtcbiAgICBhZGRDb3VudDogdHJ1ZSwgLy8gYWRkIGNvdW50IGZpZWxkIHRvIERhdGFzZXQuZGF0YXNjaGVtYVxuICAgIGRlYnVnOiB0cnVlLFxuICAgIHVzZVVybDogdHJ1ZSxcbiAgICBsb2dnaW5nOiB0cnVlLFxuICAgIGxvZ0xldmVsOiAnSU5GTycsXG4gICAgbG9nVG9XZWJTcWw6IGZhbHNlLCAvLyBpbiB1c2VyIHN0dWRpZXMsIHNldCB0aGlzIHRvIHRydWVcbiAgICBkZWZhdWx0Q29uZmlnU2V0OiAnbGFyZ2UnLFxuICAgIGFwcElkOiAndmx1aScsXG4gICAgLy8gZW1iZWRkZWQgcG9sZXN0YXIgYW5kIHZveWFnZXIgd2l0aCBrbm93biBkYXRhXG4gICAgZW1iZWRkZWREYXRhOiB3aW5kb3cudmd1aURhdGEgfHwgdW5kZWZpbmVkLFxuICAgIHByaW9yaXR5OiB7XG4gICAgICBib29rbWFyazogMCxcbiAgICAgIHBvcHVwOiAwLFxuICAgICAgdmlzbGlzdDogMTAwMFxuICAgIH0sXG4gICAgbXlyaWFSZXN0OiAnaHR0cDovL2VjMi01Mi0xLTM4LTE4Mi5jb21wdXRlLTEuYW1hem9uYXdzLmNvbTo4NzUzJyxcbiAgICBkZWZhdWx0VGltZUZuOiAneWVhcidcbiAgfSk7XG4iLCJhbmd1bGFyLm1vZHVsZShcInZsdWlcIikucnVuKFtcIiR0ZW1wbGF0ZUNhY2hlXCIsIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7JHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLW15cmlhLWRhdGFzZXRcXFwiPjxwPlNlbGVjdCBhIGRhdGFzZXQgZnJvbSB0aGUgTXlyaWEgaW5zdGFuY2UgYXQgPGlucHV0IG5nLW1vZGVsPVxcXCJteXJpYVJlc3RVcmxcXFwiPjxidXR0b24gbmctY2xpY2s9XFxcImxvYWREYXRhc2V0cyhcXCdcXCcpXFxcIj51cGRhdGU8L2J1dHRvbj4uPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldChteXJpYURhdGFzZXQpXFxcIj48ZGl2PjxzZWxlY3QgbmFtZT1cXFwibXlyaWEtZGF0YXNldFxcXCIgaWQ9XFxcInNlbGVjdC1teXJpYS1kYXRhc2V0XFxcIiBuZy1kaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIG5nLW1vZGVsPVxcXCJteXJpYURhdGFzZXRcXFwiIG5nLW9wdGlvbnM9XFxcIm9wdGlvbk5hbWUoZGF0YXNldCkgZm9yIGRhdGFzZXQgaW4gbXlyaWFEYXRhc2V0cyB0cmFjayBieSBkYXRhc2V0LnJlbGF0aW9uTmFtZVxcXCI+PG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj5TZWxlY3QgRGF0YXNldC4uLjwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLXVybC1kYXRhc2V0XFxcIj48cD5BZGQgdGhlIG5hbWUgb2YgdGhlIGRhdGFzZXQgYW5kIHRoZSBVUkwgdG8gYSA8Yj5KU09OPC9iPiBvciA8Yj5DU1Y8L2I+ICh3aXRoIGhlYWRlcikgZmlsZS4gTWFrZSBzdXJlIHRoYXQgdGhlIGZvcm1hdHRpbmcgaXMgY29ycmVjdCBhbmQgY2xlYW4gdGhlIGRhdGEgYmVmb3JlIGFkZGluZyBpdC4gVGhlIGFkZGVkIGRhdGFzZXQgaXMgb25seSB2aXNpYmxlIHRvIHlvdS48L3A+PGZvcm0gbmctc3VibWl0PVxcXCJhZGRGcm9tVXJsKGFkZGVkRGF0YXNldClcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtbmFtZVxcXCI+TmFtZTwvbGFiZWw+IDxpbnB1dCBuZy1tb2RlbD1cXFwiYWRkZWREYXRhc2V0Lm5hbWVcXFwiIGlkPVxcXCJkYXRhc2V0LW5hbWVcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtdXJsXFxcIj5VUkw8L2xhYmVsPiA8aW5wdXQgbmctbW9kZWw9XFxcImFkZGVkRGF0YXNldC51cmxcXFwiIGlkPVxcXCJkYXRhc2V0LXVybFxcXCIgdHlwZT1cXFwidXJsXFxcIj48cD5NYWtlIHN1cmUgdGhhdCB5b3UgaG9zdCB0aGUgZmlsZSBvbiBhIHNlcnZlciB0aGF0IGhhcyA8Y29kZT5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW46ICo8L2NvZGU+IHNldC48L3A+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjaGFuZ2UtbG9hZGVkLWRhdGFzZXRcXFwiPjxkaXYgbmctaWY9XFxcInVzZXJEYXRhLmxlbmd0aFxcXCI+PGgzPlVwbG9hZGVkIERhdGFzZXRzPC9oMz48dWw+PGxpIG5nLXJlcGVhdD1cXFwiZGF0YXNldCBpbiB1c2VyRGF0YSB0cmFjayBieSBkYXRhc2V0LmlkXFxcIiBuZy1jbGFzcz1cXFwie3NlbGVjdGVkOiBEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkfVxcXCI+PGEgY2xhc3M9XFxcImRhdGFzZXRcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3REYXRhc2V0KGRhdGFzZXQpXFxcIiBuZy1kaXNhYmxlZD1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWRhdGFiYXNlXFxcIj48L2k+IDxzdHJvbmc+e3tkYXRhc2V0Lm5hbWV9fTwvc3Ryb25nPjwvYT4gPHNwYW4gbmctaWY9XFxcImRhdGFzZXQuZGVzY3JpcHRpb25cXFwiPnt7ZGF0YXNldC5kZXNjcmlwdGlvbn19PC9zcGFuPiA8c3Ryb25nIG5nLWlmPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID09PSBkYXRhc2V0XFxcIj4oc2VsZWN0ZWQpPC9zdHJvbmc+PC9saT48L3VsPjwvZGl2PjxoMz5FeHBsb3JlIGEgU2FtcGxlIERhdGFzZXQ8L2gzPjx1bCBjbGFzcz1cXFwibG9hZGVkLWRhdGFzZXQtbGlzdFxcXCI+PGxpIG5nLXJlcGVhdD1cXFwiZGF0YXNldCBpbiBzYW1wbGVEYXRhIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiIG5nLWNsYXNzPVxcXCJ7c2VsZWN0ZWQ6IERhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWR9XFxcIj48YSBjbGFzcz1cXFwiZGF0YXNldFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdERhdGFzZXQoZGF0YXNldClcXFwiIG5nLWRpc2FibGVkPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGF0YWJhc2VcXFwiPjwvaT4gPHN0cm9uZz57e2RhdGFzZXQubmFtZX19PC9zdHJvbmc+PC9hPiA8c3Ryb25nIG5nLWlmPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID09PSBkYXRhc2V0XFxcIj4oc2VsZWN0ZWQpPC9zdHJvbmc+IDxlbSBuZy1pZj1cXFwiZGF0YXNldC5kZXNjcmlwdGlvblxcXCI+e3tkYXRhc2V0LmRlc2NyaXB0aW9ufX08L2VtPjwvbGk+PC91bD48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImRhdGFzZXQtbW9kYWxcXFwiIG1heC13aWR0aD1cXFwiODAwcHhcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlclxcXCI+PG1vZGFsLWNsb3NlLWJ1dHRvbj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDI+QWRkIERhdGFzZXQ8L2gyPjwvZGl2PjxkaXYgY2xhc3M9XFxcIm1vZGFsLW1haW5cXFwiPjx0YWJzZXQ+PHRhYiBoZWFkaW5nPVxcXCJDaGFuZ2UgRGF0YXNldFxcXCI+PGNoYW5nZS1sb2FkZWQtZGF0YXNldD48L2NoYW5nZS1sb2FkZWQtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIlBhc3RlIG9yIFVwbG9hZCBEYXRhXFxcIj48cGFzdGUtZGF0YXNldD48L3Bhc3RlLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJGcm9tIFVSTFxcXCI+PGFkZC11cmwtZGF0YXNldD48L2FkZC11cmwtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIkZyb20gTXlyaWFcXFwiPjxhZGQtbXlyaWEtZGF0YXNldD48L2FkZC1teXJpYS1kYXRhc2V0PjwvdGFiPjwvdGFic2V0PjwvZGl2PjwvbW9kYWw+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbFwiLFwiPGJ1dHRvbiBpZD1cXFwic2VsZWN0LWRhdGFcXFwiIGNsYXNzPVxcXCJzbWFsbC1idXR0b24gc2VsZWN0LWRhdGFcXFwiIG5nLWNsaWNrPVxcXCJsb2FkRGF0YXNldCgpO1xcXCI+Q2hhbmdlPC9idXR0b24+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9maWxlZHJvcHpvbmUuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiZHJvcHpvbmVcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9wYXN0ZWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwicGFzdGUtZGF0YVxcXCI+PGZpbGUtZHJvcHpvbmUgZGF0YXNldD1cXFwiZGF0YXNldFxcXCIgbWF4LWZpbGUtc2l6ZT1cXFwiMTBcXFwiIHZhbGlkLW1pbWUtdHlwZXM9XFxcIlt0ZXh0L2NzdiwgdGV4dC9qc29uLCB0ZXh0L3Rzdl1cXFwiPjxkaXYgY2xhc3M9XFxcInVwbG9hZC1kYXRhXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LWZpbGVcXFwiPkZpbGU8L2xhYmVsPiA8aW5wdXQgdHlwZT1cXFwiZmlsZVxcXCIgaWQ9XFxcImRhdGFzZXQtZmlsZVxcXCIgYWNjZXB0PVxcXCJ0ZXh0L2Nzdix0ZXh0L3RzdlxcXCI+PC9kaXY+PHA+VXBsb2FkIGEgQ1NWLCBvciBwYXN0ZSBkYXRhIGluIDxhIGhyZWY9XFxcImh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NvbW1hLXNlcGFyYXRlZF92YWx1ZXNcXFwiPkNTVjwvYT4gZm9ybWF0IGludG8gdGhlIGZpZWxkcy48L3A+PGRpdiBjbGFzcz1cXFwiZHJvcHpvbmUtdGFyZ2V0XFxcIj48cD5Ecm9wIENTViBmaWxlIGhlcmU8L3A+PC9kaXY+PC9kaXY+PGZvcm0gbmctc3VibWl0PVxcXCJhZGREYXRhc2V0KClcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtbmFtZVxcXCI+TmFtZTwvbGFiZWw+IDxpbnB1dCB0eXBlPVxcXCJuYW1lXFxcIiBuZy1tb2RlbD1cXFwiZGF0YXNldC5uYW1lXFxcIiBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48dGV4dGFyZWEgbmctbW9kZWw9XFxcImRhdGFzZXQuZGF0YVxcXCIgbmctbW9kZWwtb3B0aW9ucz1cXFwieyB1cGRhdGVPbjogXFwnZGVmYXVsdCBibHVyXFwnLCBkZWJvdW5jZTogeyBcXCdkZWZhdWx0XFwnOiAxNywgXFwnYmx1clxcJzogMCB9fVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuICAgICAgPC90ZXh0YXJlYT48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGE8L2J1dHRvbj48L2Zvcm0+PC9maWxlLWRyb3B6b25lPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImFsZXJ0LWJveFxcXCIgbmctc2hvdz1cXFwiQWxlcnRzLmFsZXJ0cy5sZW5ndGggPiAwXFxcIj48ZGl2IGNsYXNzPVxcXCJhbGVydC1pdGVtXFxcIiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIEFsZXJ0cy5hbGVydHNcXFwiPnt7IGFsZXJ0Lm1zZyB9fSA8YSBjbGFzcz1cXFwiY2xvc2VcXFwiIG5nLWNsaWNrPVxcXCJBbGVydHMuY2xvc2VBbGVydCgkaW5kZXgpXFxcIj4mdGltZXM7PC9hPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImJvb2ttYXJrLWxpc3RcXFwiIG5nLWlmPVxcXCJCb29rbWFya3MuaXNTdXBwb3J0ZWRcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlciBjYXJkIG5vLXRvcC1tYXJnaW4gbm8tcmlnaHQtbWFyZ2luXFxcIj48bW9kYWwtY2xvc2UtYnV0dG9uIGNsb3NlLWFjdGlvbj1cXFwiQm9va21hcmtzLmxvZ0Jvb2ttYXJrc0Nsb3NlZCgpXFxcIj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDIgY2xhc3M9XFxcIm5vLWJvdHRvbS1tYXJnaW5cXFwiPkJvb2ttYXJrcyAoe3sgQm9va21hcmtzLmxpc3QubGVuZ3RoIH19KTwvaDI+PGEgY2xhc3M9XFxcImJvb2ttYXJrLWxpc3QtdXRpbFxcXCIgbmctY2xpY2s9XFxcIkJvb2ttYXJrcy5jbGVhcigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2gtb1xcXCI+PC9pPiBDbGVhciBhbGw8L2E+IDxhIGNsYXNzPVxcXCJib29rbWFyay1saXN0LXV0aWxcXFwiIG5nLWNsaWNrPVxcXCJCb29rbWFya3MuZXhwb3J0KClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jbGlwYm9hcmRcXFwiPjwvaT4gRXhwb3J0PC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZsZXgtZ3Jvdy0xIHNjcm9sbC15XFxcIj48ZGl2IG5nLWlmPVxcXCJCb29rbWFya3MubGlzdC5sZW5ndGggPiAwXFxcIiBjbGFzcz1cXFwiaGZsZXggZmxleC13cmFwXFxcIiBzdi1yb290PVxcXCJcXFwiIHN2LXBhcnQ9XFxcIkJvb2ttYXJrcy5saXN0XFxcIiBzdi1vbi1zb3J0PVxcXCJCb29rbWFya3MucmVvcmRlcigpXFxcIj48dmwtcGxvdC1ncm91cCBuZy1yZXBlYXQ9XFxcImJvb2ttYXJrIGluIEJvb2ttYXJrcy5saXN0IHwgb3JkZXJPYmplY3RCeSA6IFxcJ3RpbWVBZGRlZFxcJyA6IGZhbHNlXFxcIiBjbGFzcz1cXFwid3JhcHBlZC12bC1wbG90LWdyb3VwIGNhcmRcXFwiIGNoYXJ0PVxcXCJib29rbWFyay5jaGFydFxcXCIgZmllbGQtc2V0PVxcXCJib29rbWFyay5jaGFydC5maWVsZFNldFxcXCIgc2hvdy1ib29rbWFyaz1cXFwidHJ1ZVxcXCIgc2hvdy1kZWJ1Zz1cXFwiY29uc3RzLmRlYnVnXFxcIiBzaG93LWV4cGFuZD1cXFwiZmFsc2VcXFwiIGFsd2F5cy1zZWxlY3RlZD1cXFwidHJ1ZVxcXCIgaGlnaGxpZ2h0ZWQ9XFxcImhpZ2hsaWdodGVkXFxcIiBvdmVyZmxvdz1cXFwidHJ1ZVxcXCIgdG9vbHRpcD1cXFwidHJ1ZVxcXCIgcHJpb3JpdHk9XFxcImNvbnN0cy5wcmlvcml0eS5ib29rbWFya1xcXCIgc3YtZWxlbWVudD1cXFwiXFxcIj48L3ZsLXBsb3QtZ3JvdXA+PGRpdiBzdi1wbGFjZWhvbGRlcj1cXFwiXFxcIj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1lbXB0eVxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5saXN0Lmxlbmd0aCA9PT0gMFxcXCI+WW91IGhhdmUgbm8gYm9va21hcmtzPC9kaXY+PC9kaXY+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwic2hlbGYtZ3JvdXBcXFwiPjxkaXYgY2xhc3M9XFxcInNoZWxmXFxcIiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiBkaXNhYmxlZCB8fCAhc3VwcG9ydE1hcmsoY2hhbm5lbElkLCBtYXJrKSwgXFwnYW55XFwnOiBpc0FueUNoYW5uZWx9XFxcIj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1sYWJlbFxcXCIgbmctY2xhc3M9XFxcIntleHBhbmRlZDogcHJvcHNFeHBhbmRlZH1cXFwiPnt7IGlzQW55Q2hhbm5lbCA/IFxcJ2FueVxcJyA6IGNoYW5uZWxJZCB9fTwvZGl2PjxkaXYgY2xhc3M9XFxcImZpZWxkLWRyb3BcXFwiIG5nLW1vZGVsPVxcXCJwaWxsc1tjaGFubmVsSWRdXFxcIiBkYXRhLWRyb3A9XFxcIiFkaXNhYmxlZCAmJiBzdXBwb3J0TWFyayhjaGFubmVsSWQsIG1hcmspXFxcIiBqcXlvdWktZHJvcHBhYmxlPVxcXCJ7b25Ecm9wOlxcJ2ZpZWxkRHJvcHBlZFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcInthY3RpdmVDbGFzczogXFwnZHJvcC1hY3RpdmVcXCd9XFxcIj48ZmllbGQtaW5mbyBuZy1zaG93PVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdLmZpZWxkXFxcIiBuZy1jbGFzcz1cXFwieyBleHBhbmRlZDogZnVuY3NFeHBhbmRlZCwgYW55OiBpc0FueUZpZWxkLCBcXCdlbnVtZXJhdGVkLWZpZWxkXFwnOiBpc0VudW1lcmF0ZWRGaWVsZCwgXFwnZW51bWVyYXRlZC1jaGFubmVsXFwnOiBpc0VudW1lcmF0ZWRDaGFubmVsLCBoaWdobGlnaHRlZDogaXNIaWdobGlnaHRlZChjaGFubmVsSWQpIH1cXFwiIGZpZWxkLWRlZj1cXFwiZW5jb2RpbmdbY2hhbm5lbElkXVxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBzaG93LWNhcmV0PVxcXCJ0cnVlXFxcIiBkaXNhYmxlLWNvdW50LWNhcmV0PVxcXCJ0cnVlXFxcIiBwb3B1cC1jb250ZW50PVxcXCJmaWVsZEluZm9Qb3B1cENvbnRlbnRcXFwiIHNob3ctcmVtb3ZlPVxcXCJ0cnVlXFxcIiByZW1vdmUtYWN0aW9uPVxcXCJyZW1vdmVGaWVsZCgpXFxcIiBjbGFzcz1cXFwic2VsZWN0ZWQgZHJhZ2dhYmxlIGZ1bGwtd2lkdGhcXFwiIGRhdGEtZHJhZz1cXFwidHJ1ZVxcXCIgbmctbW9kZWw9XFxcInBpbGxzW2NoYW5uZWxJZF1cXFwiIGpxeW91aS1kcmFnZ2FibGU9XFxcIntvblN0YXJ0OiBcXCdmaWVsZERyYWdTdGFydFxcJywgb25TdG9wOlxcJ2ZpZWxkRHJhZ1N0b3BcXCd9XFxcIiBkYXRhLWpxeW91aS1vcHRpb25zPVxcXCJ7cmV2ZXJ0OiBcXCdpbnZhbGlkXFwnLCBoZWxwZXI6IFxcJ2Nsb25lXFwnfVxcXCI+PC9maWVsZC1pbmZvPjxzcGFuIGNsYXNzPVxcXCJwbGFjZWhvbGRlclxcXCIgbmctaWY9XFxcIiFlbmNvZGluZ1tjaGFubmVsSWRdLmZpZWxkXFxcIj5kcm9wIGEgZmllbGQgaGVyZTwvc3Bhbj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBzaGVsZi1wcm9wZXJ0aWVzIHNoZWxmLXByb3BlcnRpZXMte3tjaGFubmVsSWR9fVxcXCI+PGRpdj48cHJvcGVydHktZWRpdG9yIG5nLXNob3c9XFxcInNjaGVtYS5wcm9wZXJ0aWVzLnZhbHVlXFxcIiBpZD1cXFwiY2hhbm5lbElkICsgXFwndmFsdWVcXCdcXFwiIHR5cGU9XFxcInNjaGVtYS5wcm9wZXJ0aWVzLnZhbHVlLnR5cGVcXFwiIGVudW09XFxcInNjaGVtYS5wcm9wZXJ0aWVzLnZhbHVlLmVudW1cXFwiIHByb3AtbmFtZT1cXFwiXFwndmFsdWVcXCdcXFwiIGdyb3VwPVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdXFxcIiBkZXNjcmlwdGlvbj1cXFwic2NoZW1hLnByb3BlcnRpZXMudmFsdWUuZGVzY3JpcHRpb25cXFwiIG1pbj1cXFwic2NoZW1hLnByb3BlcnRpZXMudmFsdWUubWluaW11bVxcXCIgbWF4PVxcXCJzY2hlbWEucHJvcGVydGllcy52YWx1ZS5tYXhpbXVtXFxcIiByb2xlPVxcXCJzY2hlbWEucHJvcGVydGllcy52YWx1ZS5yb2xlXFxcIiBkZWZhdWx0PVxcXCJzY2hlbWEucHJvcGVydGllcy52YWx1ZS5kZWZhdWx0XFxcIj48L3Byb3BlcnR5LWVkaXRvcj48L2Rpdj48ZGl2IG5nLXJlcGVhdD1cXFwiZ3JvdXAgaW4gW1xcJ2xlZ2VuZFxcJywgXFwnc2NhbGVcXCcsIFxcJ2F4aXNcXCcsIFxcJ2JpblxcJ11cXFwiIG5nLXNob3c9XFxcInNjaGVtYS5wcm9wZXJ0aWVzW2dyb3VwXVxcXCI+PGg0Pnt7IGdyb3VwIH19PC9oND48ZGl2IG5nLXJlcGVhdD1cXFwiKHByb3BOYW1lLCBzY2FsZVByb3ApIGluIHNjaGVtYS5wcm9wZXJ0aWVzW2dyb3VwXS5wcm9wZXJ0aWVzXFxcIiBuZy1pbml0PVxcXCJpZCA9IGNoYW5uZWxJZCArIGdyb3VwICsgJGluZGV4XFxcIiBuZy1zaG93PVxcXCJzY2FsZVByb3Auc3VwcG9ydGVkVHlwZXMgPyBzY2FsZVByb3Auc3VwcG9ydGVkVHlwZXNbZW5jb2RpbmdbY2hhbm5lbElkXS50eXBlXSA6IHRydWVcXFwiPjxwcm9wZXJ0eS1lZGl0b3IgaWQ9XFxcImlkXFxcIiB0eXBlPVxcXCJzY2FsZVByb3AudHlwZVxcXCIgZW51bT1cXFwic2NhbGVQcm9wLmVudW1cXFwiIHByb3AtbmFtZT1cXFwicHJvcE5hbWVcXFwiIGdyb3VwPVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdW2dyb3VwXVxcXCIgZGVzY3JpcHRpb249XFxcInNjYWxlUHJvcC5kZXNjcmlwdGlvblxcXCIgbWluPVxcXCJzY2FsZVByb3AubWluaW11bVxcXCIgbWF4PVxcXCJzY2FsZVByb3AubWF4aW11bVxcXCIgcm9sZT1cXFwic2NhbGVQcm9wLnJvbGVcXFwiIGRlZmF1bHQ9XFxcInNjYWxlUHJvcC5kZWZhdWx0XFxcIj48L3Byb3BlcnR5LWVkaXRvcj48L2Rpdj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJwb3B1cC1tZW51IHNoZWxmLWZ1bmN0aW9ucyBzaGVsZi1mdW5jdGlvbnMte3tjaGFubmVsSWR9fVxcXCI+PGZ1bmN0aW9uLXNlbGVjdCBuZy1pZj1cXFwiIXByZXZpZXdcXFwiIGZpZWxkLWRlZj1cXFwiZW5jb2RpbmdbY2hhbm5lbElkXVxcXCIgY2hhbm5lbC1pZD1cXFwiY2hhbm5lbElkXFxcIj48L2Z1bmN0aW9uLXNlbGVjdD48ZGl2IGNsYXNzPVxcXCJtYjVcXFwiIG5nLWlmPVxcXCJhbGxvd2VkVHlwZXMubGVuZ3RoPjFcXFwiPjxoND5UeXBlPC9oND48bGFiZWwgY2xhc3M9XFxcInR5cGUtbGFiZWxcXFwiIG5nLXJlcGVhdD1cXFwidHlwZSBpbiBhbGxvd2VkVHlwZXNcXFwiPjxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgbmctdmFsdWU9XFxcInR5cGVcXFwiIG5nLW1vZGVsPVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdLnR5cGVcXFwiPiB7e3R5cGV9fTwvbGFiZWw+PC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9maWVsZGluZm8vZmllbGRpbmZvLmh0bWxcIixcIjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1pbmZvXFxcIj48c3BhbiBjbGFzcz1cXFwiaGZsZXggZnVsbC13aWR0aFxcXCIgbmctY2xpY2s9XFxcImNsaWNrZWQoJGV2ZW50KVxcXCI+PHNwYW4gY2xhc3M9XFxcInR5cGUtY2FyZXRcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiAhZGlzYWJsZUNvdW50Q2FyZXQgfHwgZmllbGREZWYuYWdncmVnYXRlIT09XFwnY291bnRcXCd9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93blxcXCIgbmctc2hvdz1cXFwic2hvd0NhcmV0XFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJ0eXBlIGZhIHt7aWNvbn19XFxcIiBuZy1zaG93PVxcXCJzaG93VHlwZVxcXCIgdGl0bGU9XFxcInt7dHlwZU5hbWV9fVxcXCI+PC9zcGFuPjwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSE9PVxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwiZmllbGQtaW5mby10ZXh0XFxcIj48c3BhbiBuZy1pZj1cXFwiZnVuYyhmaWVsZERlZilcXFwiIGNsYXNzPVxcXCJmaWVsZC1mdW5jXFxcIiB0aXRsZT1cXFwie3sgZnVuYyhmaWVsZERlZikgfX1cXFwiIG5nLWNsYXNzPVxcXCJ7YW55OiBmaWVsZERlZi5fYW55fVxcXCI+e3sgZnVuYyhmaWVsZERlZikgfX08L3NwYW4+PHNwYW4gY2xhc3M9XFxcImZpZWxkLW5hbWVcXFwiIG5nLWNsYXNzPVxcXCJ7aGFzZnVuYzogZnVuYyhmaWVsZERlZiksIGFueTogZmllbGREZWYuX2FueX1cXFwiPnt7IChmaWVsZERlZi50aXRsZSB8fCBmaWVsZERlZi5maWVsZCkgfCB1bmRlcnNjb3JlMnNwYWNlIH19PC9zcGFuPjwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZT09PVxcJ2NvdW50XFwnIHx8IGZpZWxkRGVmLmF1dG9Db3VudFxcXCIgY2xhc3M9XFxcImZpZWxkLWNvdW50IGZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gY2xhc3M9XFxcImZpZWxkLW5hbWVcXFwiPkNPVU5UPC9zcGFuPjwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIm5vLXNocmluayByZW1vdmVcXFwiIG5nLXNob3c9XFxcInNob3dSZW1vdmVcXFwiPjxhIGNsYXNzPVxcXCJyZW1vdmUtZmllbGRcXFwiIG5nLWNsaWNrPVxcXCJyZW1vdmVBY3Rpb24oKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+PC9hPjwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIm5vLXNocmluayBhZGRcXFwiIG5nLXNob3c9XFxcInNob3dBZGRcXFwiPjxhIGNsYXNzPVxcXCJhZGQtZmllbGRcXFwiIG5nLWNsaWNrPVxcXCJhZGRBY3Rpb24oKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBsdXNcXFwiPjwvaT48L2E+PC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwibm8tc2hyaW5rIGluZm9cXFwiIG5nLXNob3c9XFxcInNob3dJbmZvICYmICFpc0VudW1TcGVjKGZpZWxkRGVmLmZpZWxkKVxcXCI+PGkgbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSAhPT0gXFwnY291bnRcXCcgJiYgY29udGFpbnNUeXBlKFt2bFR5cGUuTk9NSU5BTCwgdmxUeXBlLk9SRElOQUxdLCBmaWVsZERlZi50eXBlKVxcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPk5hbWU6PC9zdHJvbmc+IHt7ZmllbGREZWYuZmllbGR9fTxicj4gPHN0cm9uZz5DYXJkaW5hbGl0eTo8L3N0cm9uZz4ge3tzdGF0cy5kaXN0aW5jdCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1pbjo8L3N0cm9uZz4ge3tzdGF0cy5taW59fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4fX08YnI+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPiA8aSBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlICE9PSBcXCdjb3VudFxcJyAmJiBmaWVsZERlZi50eXBlID09PSB2bFR5cGUuVEVNUE9SQUxcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkRGVmLmZpZWxkfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWluIHwgZGF0ZTogc2hvcnR9fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4IHwgZGF0ZTogc2hvcnR9fTxicj4gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+IDxpIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnICYmIGZpZWxkRGVmLnR5cGUgPT09IHZsVHlwZS5RVUFOVElUQVRJVkVcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkRGVmLmZpZWxkfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWluIHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+TWF4Ojwvc3Ryb25nPiB7e3N0YXRzLm1heCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPlN0ZGV2Ojwvc3Ryb25nPiB7e3N0YXRzLnN0ZGV2IHwgbnVtYmVyOjJ9fTxicj4gPHN0cm9uZz5NZWFuOjwvc3Ryb25nPiB7e3N0YXRzLm1lYW4gfCBudW1iZXI6Mn19PGJyPiA8c3Ryb25nPk1lZGlhbjo8L3N0cm9uZz4ge3tzdGF0cy5tZWRpYW4gfCBudW1iZXJ9fTxicj4gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+PGkgbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSA9PT0gXFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5Db3VudDo8L3N0cm9uZz4ge3tzdGF0cy5tYXh9fSA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT48L3NwYW4+PC9zcGFuPjwvc3Bhbj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2Z1bmN0aW9uc2VsZWN0L2Z1bmN0aW9uc2VsZWN0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcIm1iNVxcXCIgbmctaWY9XFxcImZ1bmMubGlzdC5hYm92ZUZvbGQubGVuZ3RoID4gMSB8fCBmdW5jLmxpc3QuYWJvdmVGb2xkWzBdICE9PSB1bmRlZmluZWRcXFwiPjxoND5GdW5jdGlvbjwvaDQ+PGRpdj48bGFiZWwgY2xhc3M9XFxcImZ1bmMtbGFiZWwgZmllbGQtZnVuY1xcXCIgbmctcmVwZWF0PVxcXCJmIGluIGZ1bmMubGlzdC5hYm92ZUZvbGRcXFwiIG5nLWNsYXNzPVxcXCJ7bm9uZTogIWZ9XFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJmXFxcIiBuZy1tb2RlbD1cXFwiZnVuYy5zZWxlY3RlZFxcXCIgbmctY2hhbmdlPVxcXCJzZWxlY3RDaGFuZ2VkKClcXFwiPiB7e2YgfHwgXFwnTk9ORVxcJ319PC9sYWJlbD48L2Rpdj48ZGl2IG5nLXNob3c9XFxcInNob3dBbGxGdW5jdGlvbnNcXFwiPjxsYWJlbCBjbGFzcz1cXFwiZnVuYy1sYWJlbCBmaWVsZC1mdW5jXFxcIiBuZy1jbGFzcz1cXFwie1xcJ3NpbmdsZS1jb2x1bW5cXCc6IGZ1bmMuaXNUZW1wb3JhbH1cXFwiIG5nLXJlcGVhdD1cXFwiZiBpbiBmdW5jLmxpc3QuYmVsb3dGb2xkXFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJmXFxcIiBuZy1tb2RlbD1cXFwiZnVuYy5zZWxlY3RlZFxcXCIgbmctY2hhbmdlPVxcXCJzZWxlY3RDaGFuZ2VkKClcXFwiPiB7e2Z9fTwvbGFiZWw+PC9kaXY+PGRpdiBuZy1oaWRlPVxcXCJmdW5jLmlzQ291bnRcXFwiIGNsYXNzPVxcXCJleHBhbmQtY29sbGFwc2VcXFwiPjxhIG5nLWNsaWNrPVxcXCJzaG93QWxsRnVuY3Rpb25zPSFzaG93QWxsRnVuY3Rpb25zXFxcIj48c3BhbiBuZy1zaG93PVxcXCIhc2hvd0FsbEZ1bmN0aW9uc1xcXCI+bW9yZSA8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtZG93blxcXCIgYXJpYS1oaWRkZW49XFxcInRydWVcXFwiPjwvaT48L3NwYW4+IDxzcGFuIG5nLXNob3c9XFxcInNob3dBbGxGdW5jdGlvbnNcXFwiPmxlc3MgPGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLXVwXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9pPjwvc3Bhbj48L2E+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9tb2RhbC9tb2RhbC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJtb2RhbFxcXCIgbmctaWY9XFxcImlzT3BlblxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtd3JhcHBlclxcXCIgc3R5bGU9XFxcInt7d3JhcHBlclN0eWxlfX1cXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9tb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInJpZ2h0XFxcIj48YSBuZy1jbGljaz1cXFwiY2xvc2VNb2RhbCgpXFxcIiBjbGFzcz1cXFwicmlnaHRcXFwiPkNsb3NlPC9hPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvcHJvcGVydHllZGl0b3IvcHJvcGVydHllZGl0b3IuaHRtbFwiLFwiPGRpdj48bGFiZWwgY2xhc3M9XFxcInByb3AtbGFiZWxcXFwiIGZvcj1cXFwie3sgaWQgfX1cXFwiPjxzcGFuIGNsYXNzPVxcXCJuYW1lXFxcIiB0aXRsZT1cXFwie3sgcHJvcE5hbWUgfX1cXFwiPnt7IHByb3BOYW1lIH19PC9zcGFuPiA8c3BhbiBuZy1pZj1cXFwiZGVzY3JpcHRpb25cXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8c3Ryb25nPnt7IHByb3BOYW1lIH19PC9zdHJvbmc+PGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+e3sgZGVzY3JpcHRpb24gfX08L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvc3Bhbj48L2xhYmVsPjxmb3JtIGNsYXNzPVxcXCJpbmxpbmUtYmxvY2tcXFwiIG5nLXN3aXRjaD1cXFwidHlwZSArIChlbnVtICE9PSB1bmRlZmluZWQgPyBcXCdsaXN0XFwnIDogXFwnXFwnKVxcXCI+PGlucHV0IGlkPVxcXCJ7eyBpZCB9fVxcXCIgbmctc3dpdGNoLXdoZW49XFxcImJvb2xlYW5cXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBuZy1tb2RlbD1cXFwiZ3JvdXBbcHJvcE5hbWVdXFxcIiBuZy1oaWRlPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiPjxzZWxlY3QgaWQ9XFxcInt7IGlkIH19XFxcIiBuZy1zd2l0Y2gtd2hlbj1cXFwic3RyaW5nbGlzdFxcXCIgbmctbW9kZWw9XFxcImdyb3VwW3Byb3BOYW1lXVxcXCIgbmctb3B0aW9ucz1cXFwiY2hvaWNlIGZvciBjaG9pY2UgaW4gZW51bSB0cmFjayBieSBjaG9pY2VcXFwiIG5nLWhpZGU9XFxcImF1dG9tb2RlbC52YWx1ZVxcXCI+PC9zZWxlY3Q+PGlucHV0IGlkPVxcXCJ7eyBpZCB9fVxcXCIgbmctc3dpdGNoLXdoZW49XFxcImludGVnZXJcXFwiIG5nLWF0dHItdHlwZT1cXFwie3sgaXNSYW5nZSA/IFxcJ3JhbmdlXFwnIDogXFwnbnVtYmVyXFwnfX1cXFwiIG5nLW1vZGVsPVxcXCJncm91cFtwcm9wTmFtZV1cXFwiIG5nLW1vZGVsLW9wdGlvbnM9XFxcIntkZWJvdW5jZTogMjAwfVxcXCIgbmctYXR0ci1taW49XFxcInt7bWlufX1cXFwiIG5nLWF0dHItbWF4PVxcXCJ7e21heH19XFxcIiBuZy1oaWRlPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiIG5nLWF0dHItdGl0bGU9XFxcInt7IGlzUmFuZ2UgPyBncm91cFtwcm9wTmFtZV0gOiB1bmRlZmluZWQgfX1cXFwiPiA8aW5wdXQgaWQ9XFxcInt7IGlkIH19XFxcIiBuZy1hdHRyLXR5cGU9XFxcInt7IHJvbGUgPT09IFxcJ2NvbG9yXFwnID8gXFwnY29sb3JcXCcgOiBcXCdzdHJpbmdcXCcgfX1cXFwiIG5nLXN3aXRjaC13aGVuPVxcXCJzdHJpbmdcXFwiIG5nLW1vZGVsPVxcXCJncm91cFtwcm9wTmFtZV1cXFwiIG5nLW1vZGVsLW9wdGlvbnM9XFxcIntkZWJvdW5jZTogNTAwfVxcXCIgbmctaGlkZT1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIj4gPHNtYWxsIG5nLWlmPVxcXCJoYXNBdXRvXFxcIj48bGFiZWw+QXV0byA8aW5wdXQgbmctbW9kZWw9XFxcImF1dG9tb2RlbC52YWx1ZVxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiPjwvbGFiZWw+PC9zbWFsbD48L2Zvcm0+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwic2NoZW1hIG5vLXRvcC1tYXJnaW4gZnVsbC13aWR0aFxcXCI+PHNjaGVtYS1saXN0LWl0ZW0gbmctcmVwZWF0PVxcXCJmaWVsZERlZiBpbiBmaWVsZERlZnMgfCBvcmRlckJ5IDogb3JkZXJCeVxcXCIgZmllbGQtZGVmPVxcXCJmaWVsZERlZlxcXCIgc2hvdy1hZGQ9XFxcInNob3dBZGRcXFwiPjwvc2NoZW1hLWxpc3QtaXRlbT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdGl0ZW0uaHRtbFwiLFwiPGZpZWxkLWluZm8gZmllbGQtZGVmPVxcXCJmaWVsZERlZlxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBzaG93LWFkZD1cXFwic2hvd0FkZFxcXCIgY2xhc3M9XFxcInBpbGwgbGlzdC1pdGVtIGRyYWdnYWJsZSBmdWxsLXdpZHRoIG5vLXJpZ2h0LW1hcmdpblxcXCIgbmctY2xhc3M9XFxcInthbnk6IGlzRW51bVNwZWMoZmllbGREZWYuZmllbGQpfVxcXCIgbmctbW9kZWw9XFxcInBpbGxcXFwiIG5nLWRibGNsaWNrPVxcXCJmaWVsZEFkZChmaWVsZERlZilcXFwiIGFkZC1hY3Rpb249XFxcImZpZWxkQWRkKGZpZWxkRGVmKVxcXCIgZGF0YS1kcmFnPVxcXCJ0cnVlXFxcIiBqcXlvdWktZHJhZ2dhYmxlPVxcXCJ7cGxhY2Vob2xkZXI6IFxcJ2tlZXBcXCcsIGRlZXBDb3B5OiB0cnVlLCBvblN0YXJ0OiBcXCdmaWVsZERyYWdTdGFydFxcJywgb25TdG9wOlxcJ2ZpZWxkRHJhZ1N0b3BcXCd9XFxcIiBkYXRhLWpxeW91aS1vcHRpb25zPVxcXCJ7cmV2ZXJ0OiBcXCdpbnZhbGlkXFwnLCBoZWxwZXI6IFxcJ2Nsb25lXFwnfVxcXCI+PC9maWVsZC1pbmZvPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvc2hlbHZlcy9zaGVsdmVzLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImNhcmQgc2hlbHZlcyBuby10b3AtbWFyZ2luIG5vLXJpZ2h0LW1hcmdpbiBhYnMtMTAwXFxcIj48YSBjbGFzcz1cXFwicmlnaHRcXFwiIG5nLWNsaWNrPVxcXCJjbGVhcigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZXJhc2VyXFxcIj48L2k+IENsZWFyPC9hPjxoMj5FbmNvZGluZzwvaDI+PGRpdiBjbGFzcz1cXFwic2hlbGYtcGFuZSBzaGVsZi1lbmNvZGluZy1wYW5lIGZ1bGwtd2lkdGhcXFwiPjxoMz5Qb3NpdGlvbmFsPC9oMz48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCd4XFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwneVxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ2NvbHVtblxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCIgZGlzYWJsZWQ9XFxcIiFzcGVjLmVuY29kaW5nLnguZmllbGRcXFwiPj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwncm93XFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIiBkaXNhYmxlZD1cXFwiIXNwZWMuZW5jb2RpbmcueS5maWVsZFxcXCI+PC9jaGFubmVsLXNoZWxmPjwvZGl2PjxkaXYgY2xhc3M9XFxcInNoZWxmLXBhbmUgc2hlbGYtbWFya3MtcGFuZSBmdWxsLXdpZHRoXFxcIj48ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+PHNlbGVjdCBjbGFzcz1cXFwibWFya3NlbGVjdFxcXCIgbmctbW9kZWw9XFxcInNwZWMubWFya1xcXCIgbmctY2xhc3M9XFxcInthdXRvOiBzcGVjLm1hcmsgPT09IEFOWX1cXFwiIG5nLW9wdGlvbnM9XFxcIih0eXBlID09PSBBTlkgPyBcXCdhdXRvXFwnIDogdHlwZSkgZm9yIHR5cGUgaW4gKHN1cHBvcnRBbnkgPyBtYXJrc1dpdGhBbnkgOiBtYXJrcylcXFwiIG5nLWNoYW5nZT1cXFwibWFya0NoYW5nZSgpXFxcIj48L3NlbGVjdD48L2Rpdj48aDM+TWFya3M8L2gzPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3NpemVcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCdjb2xvclxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3NoYXBlXFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwnZGV0YWlsXFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwndGV4dFxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjwvZGl2PjxkaXYgY2xhc3M9XFxcInNoZWxmLXBhbmUgc2hlbGYtYW55LXBhbmUgZnVsbC13aWR0aFxcXCIgbmctaWY9XFxcInN1cHBvcnRBbnkgJiYgIXByZXZpZXdcXFwiPjxoMz5BdXRvbWF0aWM8L2gzPjxjaGFubmVsLXNoZWxmIG5nLXJlcGVhdD1cXFwiY2hhbm5lbElkIGluIGFueUNoYW5uZWxJZHNcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGNoYW5uZWwtaWQ9XFxcImNoYW5uZWxJZFxcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdGFicy90YWIuaHRtbFwiLFwiPGRpdiBuZy1pZj1cXFwiYWN0aXZlXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdGFicy90YWJzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidGFiLWNvbnRhaW5lclxcXCI+PGRpdj48YSBjbGFzcz1cXFwidGFiXFxcIiBuZy1yZXBlYXQ9XFxcInRhYiBpbiB0YWJzZXQudGFic1xcXCIgbmctY2xhc3M9XFxcIntcXCdhY3RpdmVcXCc6IHRhYi5hY3RpdmV9XFxcIiBuZy1jbGljaz1cXFwidGFic2V0LnNob3dUYWIodGFiKVxcXCI+e3t0YWIuaGVhZGluZ319PC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRhYi1jb250ZW50c1xcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3ZscGxvdC92bHBsb3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdFxcXCIgaWQ9XFxcInZpcy17e3Zpc0lkfX1cXFwiIG5nLWNsYXNzPVxcXCJ7IGZpdDogIWFsd2F5c1Njcm9sbGFibGUgJiYgIW92ZXJmbG93ICYmIChtYXhIZWlnaHQgJiYgKCFoZWlnaHQgfHwgaGVpZ2h0IDw9IG1heEhlaWdodCkpICYmIChtYXhXaWR0aCAmJiAoIXdpZHRoIHx8IHdpZHRoIDw9IG1heFdpZHRoKSksIG92ZXJmbG93OiBhbHdheXNTY3JvbGxhYmxlIHx8IG92ZXJmbG93IHx8IChtYXhIZWlnaHQgJiYgaGVpZ2h0ICYmIGhlaWdodCA+IG1heEhlaWdodCkgfHwgKG1heFdpZHRoICYmIHdpZHRoICYmIHdpZHRoID4gbWF4V2lkdGgpLCBzY3JvbGw6IGFsd2F5c1Njcm9sbGFibGUgfHwgdW5sb2NrZWQgfHwgaG92ZXJGb2N1cyB9XFxcIiBuZy1tb3VzZWRvd249XFxcInVubG9ja2VkPSF0aHVtYm5haWxcXFwiIG5nLW1vdXNldXA9XFxcInVubG9ja2VkPWZhbHNlXFxcIiBuZy1tb3VzZW92ZXI9XFxcIm1vdXNlb3ZlcigpXFxcIiBuZy1tb3VzZW91dD1cXFwibW91c2VvdXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwidmlzLXRvb2x0aXBcXFwiIG5nLXNob3c9XFxcInRvb2x0aXBBY3RpdmVcXFwiPjx0YWJsZT48dHIgbmctcmVwZWF0PVxcXCJwIGluIGRhdGFcXFwiPjx0ZCBjbGFzcz1cXFwia2V5XFxcIj57e3BbMF19fTwvdGQ+PHRkIGNsYXNzPVxcXCJ2YWx1ZVxcXCI+PGI+e3twWzFdfX08L2I+PC90ZD48L3RyPjwvdGFibGU+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwIHZmbGV4XFxcIj48ZGl2IG5nLXNob3c9XFxcInNob3dFeHBhbmQgfHwgZmllbGRTZXQgfHwgc2hvd1RyYW5zcG9zZSB8fCBzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkIHx8IHNob3dUb2dnbGVcXFwiIGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwLWhlYWRlciBuby1zaHJpbmtcXFwiPjxkaXYgY2xhc3M9XFxcImZpZWxkLXNldC1pbmZvXFxcIj48ZmllbGQtaW5mbyBuZy1yZXBlYXQ9XFxcImZpZWxkRGVmIGluIGZpZWxkU2V0XFxcIiBuZy1pZj1cXFwiZmllbGRTZXQgJiYgKGZpZWxkRGVmLmZpZWxkIHx8IGZpZWxkRGVmLmF1dG9Db3VudClcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIGVudW0tc3BlYy1pbmRleD1cXFwiY2hhcnQuZW51bVNwZWNJbmRleFxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBuZy1jbGFzcz1cXFwieyBzZWxlY3RlZDogYWx3YXlzU2VsZWN0ZWQgfHwgKGlzU2VsZWN0ZWQgJiYgaXNTZWxlY3RlZChmaWVsZERlZi5maWVsZCkpLCB1bnNlbGVjdGVkOiBpc1NlbGVjdGVkICYmICFpc1NlbGVjdGVkKGZpZWxkRGVmLmZpZWxkKSwgaGlnaGxpZ2h0ZWQ6IChoaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSwgXFwnZW51bWVyYXRlZC1maWVsZFxcJzogaXNFbnVtZXJhdGVkRmllbGQoY2hhcnQsICRpbmRleCksIFxcJ2VudW1lcmF0ZWQtY2hhbm5lbFxcJzogaXNFbnVtZXJhdGVkQ2hhbm5lbChjaGFydCwgJGluZGV4KSB9XFxcIiBuZy1tb3VzZW92ZXI9XFxcImZpZWxkSW5mb01vdXNlb3ZlcihmaWVsZERlZiwgJGluZGV4KVxcXCIgbmctbW91c2VvdXQ9XFxcImZpZWxkSW5mb01vdXNlb3V0KGZpZWxkRGVmLCAkaW5kZXgpXFxcIj48L2ZpZWxkLWluZm8+PC9kaXY+PGRpdiBjbGFzcz1cXFwidG9vbGJveFxcXCI+PGEgbmctaWY9XFxcImNvbnN0cy5kZWJ1ZyAmJiBzaG93RGVidWdcXFwiIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtd3JlbmNoXFxcIiBuZy1jbGljaz1cXFwic2hDb3BpZWQ9XFwnXFwnOyB2bENvcGllZD1cXCdcXCc7IHZnQ29waWVkPVxcJ1xcJztcXFwiIG5nLW1vdXNlb3Zlcj1cXFwiaW5pdGlhbGl6ZVBvcHVwKCk7XFxcIj48L2k+PC9hPjx2bC1wbG90LWdyb3VwLXBvcHVwIG5nLWlmPVxcXCJjb25zdHMuZGVidWcgJiYgc2hvd0RlYnVnICYmIHJlbmRlclBvcHVwXFxcIj48L3ZsLXBsb3QtZ3JvdXAtcG9wdXA+PGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIFgtU2NhbGVcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneFxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy1yaWdodFxcXCI+PC9pPiA8c21hbGw+TG9nIFg8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIFktU2NhbGVcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneVxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy11cFxcXCI+PC9pPiA8c21hbGw+TG9nIFk8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dTb3J0ICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVTb3J0LnN1cHBvcnQoY2hhcnQudmxTcGVjKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVTb3J0LnRvZ2dsZShjaGFydC52bFNwZWMpXFxcIiB0aXRsZT1cXFwiU29ydFxcXCI+PGkgY2xhc3M9XFxcImZhIHNvcnRcXFwiIG5nLWNsYXNzPVxcXCJ0b2dnbGVTb3J0Q2xhc3MoY2hhcnQudmxTcGVjKVxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+U29ydDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0ZpbHRlck51bGwgJiYgY2hhcnQudmxTcGVjICYmIHRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydChjaGFydC52bFNwZWMpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRvZ2dsZUZpbHRlck51bGwoY2hhcnQudmxTcGVjKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGNoYXJ0LnZsU3BlYyAmJiAoY2hhcnQudmxTcGVjLnRyYW5zZm9ybXx8e30pLmZpbHRlckludmFsaWR9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZmlsdGVyXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5GaWx0ZXI8L3NtYWxsPiA8c21hbGw+TlVMTDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1RyYW5zcG9zZVxcXCIgdGl0bGU9XFxcIlN3YXAgWC9ZXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRyYW5zcG9zZSgpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcmVmcmVzaCB0cmFuc3Bvc2VcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPlN3YXAgWC9ZPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgdGl0bGU9XFxcIkJvb2ttYXJrXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlQm9va21hcmsoY2hhcnQpXFxcIiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiAhY2hhcnQudmxTcGVjLmVuY29kaW5nLCBhY3RpdmU6IEJvb2ttYXJrcy5pc0Jvb2ttYXJrZWQoY2hhcnQuc2hvcnRoYW5kKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib29rbWFya1xcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+Qm9va21hcms8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dFeHBhbmRcXFwiIG5nLWNsaWNrPVxcXCJleHBhbmRBY3Rpb24oKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2E+IDxhIG5nLWlmPVxcXCJzaG93U2VsZWN0XFxcIiB0aXRsZT1cXFwiU2VsZWN0IHRoaXMgZW5jb2RpbmdcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3RBY3Rpb24oKVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgc2VsZWN0XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtc2VydmVyXFxcIj48L2k+PC9hPjxkaXYgbmctaWY9XFxcInNob3dCb29rbWFya0FsZXJ0XFxcIiBjbGFzcz1cXFwiYm9va21hcmstYWxlcnRcXFwiPjxkaXY+UmVtb3ZlIGJvb2ttYXJrPzwvZGl2PjxzbWFsbD5Zb3VyIG5vdGVzIHdpbGwgYmUgbG9zdC48L3NtYWxsPjxkaXY+PGEgbmctY2xpY2s9XFxcInJlbW92ZUJvb2ttYXJrKGNoYXJ0KVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoLW9cXFwiPjwvaT4gcmVtb3ZlIGl0PC9hPiA8YSBuZy1jbGljaz1cXFwia2VlcEJvb2ttYXJrKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib29rbWFya1xcXCI+PC9pPiBrZWVwIGl0PC9hPjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2Pjx2bC1wbG90IGNsYXNzPVxcXCJmbGV4LWdyb3ctMVxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBkaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIGlzLWluLWxpc3Q9XFxcImlzSW5MaXN0XFxcIiBhbHdheXMtc2Nyb2xsYWJsZT1cXFwiYWx3YXlzU2Nyb2xsYWJsZVxcXCIgY29uZmlnLXNldD1cXFwie3tjb25maWdTZXR8fFxcJ3NtYWxsXFwnfX1cXFwiIG1heC1oZWlnaHQ9XFxcIm1heEhlaWdodFxcXCIgbWF4LXdpZHRoPVxcXCJtYXhXaWR0aFxcXCIgb3ZlcmZsb3c9XFxcIm92ZXJmbG93XFxcIiBwcmlvcml0eT1cXFwicHJpb3JpdHlcXFwiIHJlc2NhbGU9XFxcInJlc2NhbGVcXFwiIHRodW1ibmFpbD1cXFwidGh1bWJuYWlsXFxcIiB0b29sdGlwPVxcXCJ0b29sdGlwXFxcIj48L3ZsLXBsb3Q+PHRleHRhcmVhIGNsYXNzPVxcXCJhbm5vdGF0aW9uXFxcIiBuZy1pZj1cXFwiQm9va21hcmtzLmlzQm9va21hcmtlZChjaGFydC5zaG9ydGhhbmQpXFxcIiBuZy1tb2RlbD1cXFwiQm9va21hcmtzLmRpY3RbY2hhcnQuc2hvcnRoYW5kXS5hbm5vdGF0aW9uXFxcIiBuZy1jaGFuZ2U9XFxcIkJvb2ttYXJrcy5zYXZlQW5ub3RhdGlvbnMoY2hhcnQuc2hvcnRoYW5kKVxcXCIgcGxhY2Vob2xkZXI9XFxcIm5vdGVzXFxcIj48L3RleHRhcmVhPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBwb3B1cC1jb21tYW5kIG5vLXNocmluayBkZXYtdG9vbFxcXCI+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WbDwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZsQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQuY2xlYW5TcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhLUxpdGVcXCcsIGNoYXJ0LmNsZWFuU3BlYyk7IHZsQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZsQ29waWVkfX08L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WZzwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZnQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQudmdTcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhXFwnLCBjaGFydC52Z1NwZWMpOyB2Z0NvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3t2Z0NvcGllZH19PC9zcGFuPjwvZGl2PjxhIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIiBuZy1ocmVmPVxcXCJ7eyB7dHlwZTpcXCd2bFxcJywgc3BlYzogY2hhcnQuY2xlYW5TcGVjfSB8IHJlcG9ydFVybCB9fVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPlJlcG9ydCBCYWQgUmVuZGVyPC9hPiA8YSBuZy1jbGljaz1cXFwic2hvd0ZlYXR1cmU9IXNob3dGZWF0dXJlXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+e3tjaGFydC5zY29yZX19PC9hPjxkaXYgbmctcmVwZWF0PVxcXCJmIGluIGNoYXJ0LnNjb3JlRmVhdHVyZXMgdHJhY2sgYnkgZi5yZWFzb25cXFwiPlt7e2Yuc2NvcmV9fV0ge3tmLnJlYXNvbn19PC9kaXY+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3Rncm91cGxpc3QvdmxwbG90Z3JvdXBsaXN0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInZsLXBsb3QtZ3JvdXAtbGlzdC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInZpcy1saXN0LWhlYWRlclxcXCIgbmctc2hvdz1cXFwibGlzdFRpdGxlXFxcIj48aDM+e3tsaXN0VGl0bGV9fTwvaDM+PHNwYW4gY2xhc3M9XFxcImRlc2NyaXB0aW9uXFxcIj48L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwidmlzLWxpc3QgaGZsZXggZmxleC13cmFwXFxcIj48dmwtcGxvdC1ncm91cCBuZy1yZXBlYXQ9XFxcIml0ZW0gaW4gaXRlbXMgfCBsaW1pdFRvOiBsaW1pdFxcXCIgbmctaW5pdD1cXFwiY2hhcnQgPSBnZXRDaGFydChpdGVtKVxcXCIgY2xhc3M9XFxcIndyYXBwZWQtdmwtcGxvdC1ncm91cCBjYXJkXFxcIiBjaGFydD1cXFwiY2hhcnRcXFwiIGlzLWluLWxpc3Q9XFxcImlzSW5MaXN0XFxcIiBlbmFibGUtcGlsbHMtcHJldmlldz1cXFwiZW5hYmxlUGlsbHNQcmV2aWV3XFxcIiBmaWVsZC1zZXQ9XFxcImNoYXJ0LmZpZWxkU2V0XFxcIiBzaG93LWJvb2ttYXJrPVxcXCJ0cnVlXFxcIiBzaG93LWRlYnVnPVxcXCJjb25zdHMuZGVidWcgJiYgY29uc3RzLmRlYnVnSW5MaXN0XFxcIiBzaG93LXNlbGVjdD1cXFwidHJ1ZVxcXCIgc2hvdy1maWx0ZXItbnVsbD1cXFwidHJ1ZVxcXCIgc2hvdy1sb2c9XFxcInRydWVcXFwiIHNob3ctc29ydD1cXFwidHJ1ZVxcXCIgb3ZlcmZsb3c9XFxcInRydWVcXFwiIHRvb2x0aXA9XFxcInRydWVcXFwiIGhpZ2hsaWdodGVkPVxcXCJQaWxscy5oaWdobGlnaHRlZFxcXCIgc2VsZWN0LWFjdGlvbj1cXFwic2VsZWN0KGNoYXJ0KVxcXCIgcHJpb3JpdHk9XFxcInByaW9yaXR5ICsgJGluZGV4XFxcIj48L3ZsLXBsb3QtZ3JvdXA+PC9kaXY+PGEgbmctY2xpY2s9XFxcImluY3JlYXNlTGltaXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwidmlzLWxpc3QtbW9yZVxcXCIgbmctc2hvdz1cXFwibGltaXQgPCBpdGVtcy5sZW5ndGhcXFwiPkxvYWQgbW9yZS4uLjwvZGl2PjwvYT48L2Rpdj5cIik7fV0pOyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRNeXJpYURhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRNeXJpYURhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhZGRNeXJpYURhdGFzZXQnLCBmdW5jdGlvbiAoJGh0dHAsIERhdGFzZXQsIGNvbnN0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5teXJpYVJlc3RVcmwgPSBjb25zdHMubXlyaWFSZXN0O1xuICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gW107XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldCA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXRzID0gZnVuY3Rpb24ocXVlcnkpIHtcbiAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC9zZWFyY2gvP3E9JyArIHF1ZXJ5KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0cyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBMb2FkIHRoZSBhdmFpbGFibGUgZGF0YXNldHMgZnJvbSBNeXJpYVxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMoJycpO1xuXG4gICAgICAgIHNjb3BlLm9wdGlvbk5hbWUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFzZXQudXNlck5hbWUgKyAnOicgKyBkYXRhc2V0LnByb2dyYW1OYW1lICsgJzonICsgZGF0YXNldC5yZWxhdGlvbk5hbWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKG15cmlhRGF0YXNldCkge1xuICAgICAgICAgIHZhciBkYXRhc2V0ID0ge1xuICAgICAgICAgICAgZ3JvdXA6ICdteXJpYScsXG4gICAgICAgICAgICBuYW1lOiBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lLFxuICAgICAgICAgICAgdXJsOiBzY29wZS5teXJpYVJlc3RVcmwgKyAnL2RhdGFzZXQvdXNlci0nICsgbXlyaWFEYXRhc2V0LnVzZXJOYW1lICtcbiAgICAgICAgICAgICAgJy9wcm9ncmFtLScgKyBteXJpYURhdGFzZXQucHJvZ3JhbU5hbWUgK1xuICAgICAgICAgICAgICAnL3JlbGF0aW9uLScgKyBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lICsgJy9kYXRhP2Zvcm1hdD1qc29uJ1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRVcmxEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYWRkVXJsRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZFVybERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGR1cmxkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aGUgZGF0YXNldCB0byBhZGRcbiAgICAgICAgc2NvcGUuYWRkZWREYXRhc2V0ID0ge1xuICAgICAgICAgIGdyb3VwOiAndXNlcidcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGRGcm9tVXJsID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX05FV19VUkwsIGRhdGFzZXQudXJsKTtcblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKGRhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gRmV0Y2ggJiBhY3RpdmF0ZSB0aGUgbmV3bHktcmVnaXN0ZXJlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmluR3JvdXBcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGluR3JvdXBcbiAqIEdldCBkYXRhc2V0cyBpbiBhIHBhcnRpY3VsYXIgZ3JvdXBcbiAqIEBwYXJhbSAge1N0cmluZ30gZGF0YXNldEdyb3VwIE9uZSBvZiBcInNhbXBsZSxcIiBcInVzZXJcIiwgb3IgXCJteXJpYVwiXG4gKiBAcmV0dXJuIHtBcnJheX0gQW4gYXJyYXkgb2YgZGF0YXNldHMgaW4gdGhlIHNwZWNpZmllZCBncm91cFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2luR3JvdXAnLCBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFyciwgZGF0YXNldEdyb3VwKSB7XG4gICAgICByZXR1cm4gXy5maWx0ZXIoYXJyLCB7XG4gICAgICAgIGdyb3VwOiBkYXRhc2V0R3JvdXBcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmNoYW5nZUxvYWRlZERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBjaGFuZ2VMb2FkZWREYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnY2hhbmdlTG9hZGVkRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBfKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHBvc2UgZGF0YXNldCBvYmplY3QgaXRzZWxmIHNvIGN1cnJlbnQgZGF0YXNldCBjYW4gYmUgbWFya2VkXG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuXG4gICAgICAgIHNjb3BlLnVzZXJEYXRhID0gXy5maWx0ZXIoRGF0YXNldC5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIHJldHVybiBkYXRhc2V0Lmdyb3VwICE9PSAnc2FtcGxlJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuc2FtcGxlRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIHtcbiAgICAgICAgICBncm91cDogJ3NhbXBsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBEYXRhc2V0LmRhdGFzZXRzLmxlbmd0aDtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdERhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShkYXRhc2V0KTtcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0RhdGFzZXQnLCBmdW5jdGlvbigkaHR0cCwgJHEsIEFsZXJ0cywgXywgdXRpbCwgdmwsIGNxbCwgU2FtcGxlRGF0YSwgQ29uZmlnLCBMb2dnZXIpIHtcbiAgICB2YXIgRGF0YXNldCA9IHt9O1xuXG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBzYW1wbGUgZGF0YXNldHNcbiAgICB2YXIgZGF0YXNldHMgPSBTYW1wbGVEYXRhO1xuXG4gICAgRGF0YXNldC5kYXRhc2V0cyA9IGRhdGFzZXRzO1xuICAgIERhdGFzZXQuZGF0YXNldCA9IGRhdGFzZXRzWzFdO1xuICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSB1bmRlZmluZWQ7ICAvLyBkYXRhc2V0IGJlZm9yZSB1cGRhdGVcbiAgICBEYXRhc2V0LmRhdGFzY2hlbWEgPSBbXTtcbiAgICBEYXRhc2V0LnN0YXRzID0ge307XG4gICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuXG4gICAgdmFyIHR5cGVPcmRlciA9IHtcbiAgICAgIG5vbWluYWw6IDAsXG4gICAgICBvcmRpbmFsOiAwLFxuICAgICAgZ2VvZ3JhcGhpYzogMixcbiAgICAgIHRlbXBvcmFsOiAzLFxuICAgICAgcXVhbnRpdGF0aXZlOiA0XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5ID0ge307XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIGlmIChmaWVsZERlZi5hZ2dyZWdhdGU9PT0nY291bnQnKSByZXR1cm4gNDtcbiAgICAgIHJldHVybiB0eXBlT3JkZXJbZmllbGREZWYudHlwZV07XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZShmaWVsZERlZikgKyAnXycgK1xuICAgICAgICAoZmllbGREZWYuYWdncmVnYXRlID09PSAnY291bnQnID8gJ34nIDogZmllbGREZWYuZmllbGQudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIC8vIH4gaXMgdGhlIGxhc3QgY2hhcmFjdGVyIGluIEFTQ0lJXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5Lm9yaWdpbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gMDsgLy8gbm8gc3dhcCB3aWxsIG9jY3VyXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LmZpZWxkID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIHJldHVybiBmaWVsZERlZi5maWVsZDtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyID0gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lO1xuXG4gICAgLy8gdXBkYXRlIHRoZSBzY2hlbWEgYW5kIHN0YXRzXG4gICAgRGF0YXNldC5vblVwZGF0ZSA9IFtdO1xuXG4gICAgRGF0YXNldC51cGRhdGUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICB2YXIgdXBkYXRlUHJvbWlzZTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfQ0hBTkdFLCBkYXRhc2V0Lm5hbWUpO1xuXG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9ICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgdXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YXNldC52YWx1ZXMpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gJGh0dHAuZ2V0KGRhdGFzZXQudXJsLCB7Y2FjaGU6IHRydWV9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgdmFyIGRhdGE7XG5cbiAgICAgICAgICAvLyBmaXJzdCBzZWUgd2hldGhlciB0aGUgZGF0YSBpcyBKU09OLCBvdGhlcndpc2UgdHJ5IHRvIHBhcnNlIENTVlxuICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2pzb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gdXRpbC5yZWFkKHJlc3BvbnNlLmRhdGEsIHt0eXBlOiAnY3N2J30pO1xuICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2Nzdic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBEYXRhc2V0Lm9uVXBkYXRlLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9IHVwZGF0ZVByb21pc2UudGhlbihsaXN0ZW5lcik7XG4gICAgICB9KTtcblxuICAgICAgLy8gQ29weSB0aGUgZGF0YXNldCBpbnRvIHRoZSBjb25maWcgc2VydmljZSBvbmNlIGl0IGlzIHJlYWR5XG4gICAgICB1cGRhdGVQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIENvbmZpZy51cGRhdGVEYXRhc2V0KGRhdGFzZXQsIERhdGFzZXQudHlwZSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHVwZGF0ZVByb21pc2U7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldEZpZWxkRGVmcyhzY2hlbWEsIG9yZGVyKSB7XG4gICAgICB2YXIgZmllbGREZWZzID0gc2NoZW1hLmZpZWxkcygpLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICB0eXBlOiBzY2hlbWEudHlwZShmaWVsZCksXG4gICAgICAgICAgcHJpbWl0aXZlVHlwZTogc2NoZW1hLnByaW1pdGl2ZVR5cGUoZmllbGQpXG4gICAgICAgIH07XG4gICAgICB9KTtcblxuICAgICAgZmllbGREZWZzID0gdXRpbC5zdGFibGVzb3J0KGZpZWxkRGVmcywgb3JkZXIgfHwgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lLCBEYXRhc2V0LmZpZWxkT3JkZXJCeS5maWVsZCk7XG5cbiAgICAgIGZpZWxkRGVmcy5wdXNoKHsgZmllbGQ6ICcqJywgYWdncmVnYXRlOiB2bC5hZ2dyZWdhdGUuQWdncmVnYXRlT3AuQ09VTlQsIHR5cGU6IHZsLnR5cGUuUVVBTlRJVEFUSVZFfSk7XG4gICAgICByZXR1cm4gZmllbGREZWZzO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gdXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSkge1xuICAgICAgRGF0YXNldC5kYXRhID0gZGF0YTtcbiAgICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSBkYXRhc2V0O1xuXG4gICAgICBEYXRhc2V0LnNjaGVtYSA9IGNxbC5zY2hlbWEuU2NoZW1hLmJ1aWxkKGRhdGEpO1xuICAgICAgLy8gVE9ETzogZmluZCBhbGwgcmVmZXJlbmNlIG9mIERhdGFzZXQuc3RhdHMuc2FtcGxlIGFuZCByZXBsYWNlXG5cbiAgICAgIC8vIFRPRE86IGZpbmQgYWxsIHJlZmVyZW5jZSBvZiBEYXRhc2V0LmRhdGFzY2hlbWEgYW5kIHJlcGxhY2VcbiAgICAgIERhdGFzZXQuZGF0YXNjaGVtYSA9IGdldEZpZWxkRGVmcyhEYXRhc2V0LnNjaGVtYSk7XG4gICAgfVxuXG4gICAgRGF0YXNldC5hZGQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICBpZiAoIWRhdGFzZXQuaWQpIHtcbiAgICAgICAgZGF0YXNldC5pZCA9IGRhdGFzZXQudXJsO1xuICAgICAgfVxuICAgICAgZGF0YXNldHMucHVzaChkYXRhc2V0KTtcblxuICAgICAgcmV0dXJuIGRhdGFzZXQ7XG4gICAgfTtcblxuICAgIHJldHVybiBEYXRhc2V0O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpkYXRhc2V0TW9kYWxcbiAqIEBkZXNjcmlwdGlvblxuICogIyBkYXRhc2V0TW9kYWxcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdkYXRhc2V0TW9kYWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0bW9kYWwuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IGZhbHNlXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldFNlbGVjdG9yJywgZnVuY3Rpb24oTW9kYWxzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5sb2FkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX09QRU4pO1xuICAgICAgICAgIE1vZGFscy5vcGVuKCdkYXRhc2V0LW1vZGFsJyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmlsZURyb3B6b25lXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmlsZURyb3B6b25lXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLy8gQWRkIHRoZSBmaWxlIHJlYWRlciBhcyBhIG5hbWVkIGRlcGVuZGVuY3lcbiAgLmNvbnN0YW50KCdGaWxlUmVhZGVyJywgd2luZG93LkZpbGVSZWFkZXIpXG4gIC5kaXJlY3RpdmUoJ2ZpbGVEcm9wem9uZScsIGZ1bmN0aW9uIChNb2RhbHMsIEFsZXJ0cywgRmlsZVJlYWRlcikge1xuXG4gICAgLy8gSGVscGVyIG1ldGhvZHNcblxuICAgIGZ1bmN0aW9uIGlzU2l6ZVZhbGlkKHNpemUsIG1heFNpemUpIHtcbiAgICAgIC8vIFNpemUgaXMgcHJvdmlkZWQgaW4gYnl0ZXM7IG1heFNpemUgaXMgcHJvdmlkZWQgaW4gbWVnYWJ5dGVzXG4gICAgICAvLyBDb2VyY2UgbWF4U2l6ZSB0byBhIG51bWJlciBpbiBjYXNlIGl0IGNvbWVzIGluIGFzIGEgc3RyaW5nLFxuICAgICAgLy8gJiByZXR1cm4gdHJ1ZSB3aGVuIG1heCBmaWxlIHNpemUgd2FzIG5vdCBzcGVjaWZpZWQsIGlzIGVtcHR5LFxuICAgICAgLy8gb3IgaXMgc3VmZmljaWVudGx5IGxhcmdlXG4gICAgICByZXR1cm4gIW1heFNpemUgfHwgKCBzaXplIC8gMTAyNCAvIDEwMjQgPCArbWF4U2l6ZSApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVHlwZVZhbGlkKHR5cGUsIHZhbGlkTWltZVR5cGVzKSB7XG4gICAgICAgIC8vIElmIG5vIG1pbWUgdHlwZSByZXN0cmljdGlvbnMgd2VyZSBwcm92aWRlZCwgb3IgdGhlIHByb3ZpZGVkIGZpbGUnc1xuICAgICAgICAvLyB0eXBlIGlzIHdoaXRlbGlzdGVkLCB0eXBlIGlzIHZhbGlkXG4gICAgICByZXR1cm4gIXZhbGlkTWltZVR5cGVzIHx8ICggdmFsaWRNaW1lVHlwZXMuaW5kZXhPZih0eXBlKSA+IC0xICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9maWxlZHJvcHpvbmUuaHRtbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIC8vIFBlcm1pdCBhcmJpdHJhcnkgY2hpbGQgY29udGVudFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIG1heEZpbGVTaXplOiAnQCcsXG4gICAgICAgIHZhbGlkTWltZVR5cGVzOiAnQCcsXG4gICAgICAgIC8vIEV4cG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGRhdGFzZXQgcHJvcGVydHkgdG8gcGFyZW50IHNjb3BlcyB0aHJvdWdoXG4gICAgICAgIC8vIHR3by13YXkgZGF0YWJpbmRpbmdcbiAgICAgICAgZGF0YXNldDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LyosIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHNjb3BlLmRhdGFzZXQgfHwge307XG5cbiAgICAgICAgZWxlbWVudC5vbignZHJhZ292ZXIgZHJhZ2VudGVyJywgZnVuY3Rpb24gb25EcmFnRW50ZXIoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSAnY29weSc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRGaWxlKGZpbGUpIHtcbiAgICAgICAgICBpZiAoIWlzVHlwZVZhbGlkKGZpbGUudHlwZSwgc2NvcGUudmFsaWRNaW1lVHlwZXMpKSB7XG4gICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0ludmFsaWQgZmlsZSB0eXBlLiBGaWxlIG11c3QgYmUgb25lIG9mIGZvbGxvd2luZyB0eXBlczogJyArIHNjb3BlLnZhbGlkTWltZVR5cGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWlzU2l6ZVZhbGlkKGZpbGUuc2l6ZSwgc2NvcGUubWF4RmlsZVNpemUpKSB7XG4gICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0ZpbGUgbXVzdCBiZSBzbWFsbGVyIHRoYW4gJyArIHNjb3BlLm1heEZpbGVTaXplICsgJyBNQicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3BlLiRhcHBseShmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgICBzY29wZS5kYXRhc2V0LmRhdGEgPSBldnQudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgLy8gU3RyaXAgZmlsZSBuYW1lIGV4dGVuc2lvbnMgZnJvbSB0aGUgdXBsb2FkZWQgZGF0YVxuICAgICAgICAgICAgICBzY29wZS5kYXRhc2V0Lm5hbWUgPSBmaWxlLm5hbWUucmVwbGFjZSgvXFwuXFx3KyQvLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0Vycm9yIHJlYWRpbmcgZmlsZScpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQub24oJ2Ryb3AnLCBmdW5jdGlvbiBvbkRyb3AoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVhZEZpbGUoZXZlbnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBlbGVtZW50LmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uIG9uVXBsb2FkKC8qZXZlbnQqLykge1xuICAgICAgICAgIC8vIFwidGhpc1wiIGlzIHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgcmVhZEZpbGUodGhpcy5maWxlc1swXSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6cGFzdGVEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcGFzdGVEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgncGFzdGVEYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIExvZ2dlciwgQ29uZmlnLCBfLCB2Zykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvcGFzdGVkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5kYXRhc2V0ID0ge1xuICAgICAgICAgIG5hbWU6ICcnLFxuICAgICAgICAgIGRhdGE6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkYXRhID0gdmcudXRpbC5yZWFkKHNjb3BlLmRhdGFzZXQuZGF0YSwge1xuICAgICAgICAgICAgdHlwZTogJ2NzdidcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBwYXN0ZWREYXRhc2V0ID0ge1xuICAgICAgICAgICAgaWQ6IERhdGUubm93KCksICAvLyB0aW1lIGFzIGlkXG4gICAgICAgICAgICBuYW1lOiBzY29wZS5kYXRhc2V0Lm5hbWUsXG4gICAgICAgICAgICB2YWx1ZXM6IGRhdGEsXG4gICAgICAgICAgICBncm91cDogJ3Bhc3RlZCdcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gTG9nIHRoYXQgd2UgaGF2ZSBwYXN0ZWQgZGF0YVxuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX05FV19QQVNURSwgcGFzdGVkRGF0YXNldC5uYW1lKTtcblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBwYXN0ZWQgZGF0YSBhcyBhIG5ldyBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQocGFzdGVkRGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgbmV3bHktcmVnaXN0ZXJlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIC8vIENsb3NlIHRoaXMgZGlyZWN0aXZlJ3MgY29udGFpbmluZyBtb2RhbFxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKS5jb25zdGFudCgnU2FtcGxlRGF0YScsIFt7XG4gIG5hbWU6ICdCYXJsZXknLFxuICBkZXNjcmlwdGlvbjogJ0JhcmxleSB5aWVsZCBieSB2YXJpZXR5IGFjcm9zcyB0aGUgdXBwZXIgbWlkd2VzdCBpbiAxOTMxIGFuZCAxOTMyJyxcbiAgdXJsOiAnZGF0YS9iYXJsZXkuanNvbicsXG4gIGlkOiAnYmFybGV5JyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NhcnMnLFxuICBkZXNjcmlwdGlvbjogJ0F1dG9tb3RpdmUgc3RhdGlzdGljcyBmb3IgYSB2YXJpZXR5IG9mIGNhciBtb2RlbHMgYmV0d2VlbiAxOTcwICYgMTk4MicsXG4gIHVybDogJ2RhdGEvY2Fycy5qc29uJyxcbiAgaWQ6ICdjYXJzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NyaW1lYScsXG4gIHVybDogJ2RhdGEvY3JpbWVhLmpzb24nLFxuICBpZDogJ2NyaW1lYScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdEcml2aW5nJyxcbiAgdXJsOiAnZGF0YS9kcml2aW5nLmpzb24nLFxuICBpZDogJ2RyaXZpbmcnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnSXJpcycsXG4gIHVybDogJ2RhdGEvaXJpcy5qc29uJyxcbiAgaWQ6ICdpcmlzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0pvYnMnLFxuICB1cmw6ICdkYXRhL2pvYnMuanNvbicsXG4gIGlkOiAnam9icycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdQb3B1bGF0aW9uJyxcbiAgdXJsOiAnZGF0YS9wb3B1bGF0aW9uLmpzb24nLFxuICBpZDogJ3BvcHVsYXRpb24nLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnTW92aWVzJyxcbiAgdXJsOiAnZGF0YS9tb3ZpZXMuanNvbicsXG4gIGlkOiAnbW92aWVzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0JpcmRzdHJpa2VzJyxcbiAgdXJsOiAnZGF0YS9iaXJkc3RyaWtlcy5qc29uJyxcbiAgaWQ6ICdiaXJkc3RyaWtlcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCdXJ0aW4nLFxuICB1cmw6ICdkYXRhL2J1cnRpbi5qc29uJyxcbiAgaWQ6ICdidXJ0aW4nLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ2FtcGFpZ25zJyxcbiAgdXJsOiAnZGF0YS93ZWJhbGwyNi5qc29uJyxcbiAgaWQ6ICd3ZWJhbGwyNicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FsZXJ0TWVzc2FnZXMnLCBmdW5jdGlvbihBbGVydHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2FsZXJ0bWVzc2FnZXMvYWxlcnRtZXNzYWdlcy5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge30sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSAvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5BbGVydHMgPSBBbGVydHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Ym9va21hcmtMaXN0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYm9va21hcmtMaXN0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYm9va21hcmtMaXN0JywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9ib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoaWdobGlnaHRlZDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuQm9va21hcmtzID0gQm9va21hcmtzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnY2hhbm5lbFNoZWxmJywgZnVuY3Rpb24oQU5ZLCBEYXRhc2V0LCBQaWxscywgXywgRHJvcCwgTG9nZ2VyLCB2bCwgY3FsLCBTY2hlbWEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNoYW5uZWxJZDogJz0nLFxuICAgICAgICBlbmNvZGluZzogJz0nLFxuICAgICAgICBtYXJrOiAnPScsXG4gICAgICAgIHByZXZpZXc6ICc9JyxcbiAgICAgICAgZGlzYWJsZWQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50IC8qLCBhdHRycyovKSB7XG4gICAgICAgIHZhciBwcm9wc1BvcHVwLCBmdW5jc1BvcHVwO1xuXG4gICAgICAgIC8vIFRPRE8oaHR0cHM6Ly9naXRodWIuY29tL3ZlZ2EvdmVnYS1saXRlLXVpL2lzc3Vlcy8xODcpOlxuICAgICAgICAvLyBjb25zaWRlciBpZiB3ZSBjYW4gdXNlIHZhbGlkYXRvciAvIGNxbCBpbnN0ZWFkXG4gICAgICAgIHNjb3BlLmFsbG93ZWRDYXN0aW5nID0ge1xuICAgICAgICAgIHF1YW50aXRhdGl2ZTogW3ZsLnR5cGUuUVVBTlRJVEFUSVZFLCB2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgb3JkaW5hbDogW3ZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXSxcbiAgICAgICAgICBub21pbmFsOiBbdmwudHlwZS5OT01JTkFMLCB2bC50eXBlLk9SRElOQUxdLFxuICAgICAgICAgIHRlbXBvcmFsOiBbdmwudHlwZS5URU1QT1JBTCwgdmwudHlwZS5PUkRJTkFMLCB2bC50eXBlLk5PTUlOQUxdXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IFNjaGVtYS5nZXRDaGFubmVsU2NoZW1hKHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgIHNjb3BlLnBpbGxzID0gUGlsbHMucGlsbHM7XG5cbiAgICAgICAgc2NvcGUuaXNIaWdobGlnaHRlZCA9IGZ1bmN0aW9uIChjaGFubmVsSWQpIHtcbiAgICAgICAgICB2YXIgaGlnaGxpZ2h0ZWQgPSBQaWxscy5oaWdobGlnaHRlZCB8fCB7fTtcbiAgICAgICAgICByZXR1cm4gaGlnaGxpZ2h0ZWRbc2NvcGUuZW5jb2RpbmdbY2hhbm5lbElkXS5maWVsZF0gfHxcbiAgICAgICAgICAgIGhpZ2hsaWdodGVkWydmJyArIGNoYW5uZWxJZF07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVGhlc2Ugd2lsbCBnZXQgdXBkYXRlZCBpbiB0aGUgd2F0Y2hlclxuICAgICAgICBzY29wZS5pc0FueUNoYW5uZWwgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuaXNBbnlGaWVsZCA9IGZhbHNlO1xuXG4gICAgICAgIHNjb3BlLnN1cHBvcnRNYXJrID0gZnVuY3Rpb24oY2hhbm5lbElkLCBtYXJrKSB7XG4gICAgICAgICAgaWYgKFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1hcmsgPT09IEFOWSkgeyAvLyBUT0RPOiBzdXBwb3J0IHtlbnVtOiBbLi4uXX1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmwuY2hhbm5lbC5zdXBwb3J0TWFyayhjaGFubmVsSWQsIG1hcmspO1xuICAgICAgICB9O1xuXG4gICAgICAgIHByb3BzUG9wdXAgPSBuZXcgRHJvcCh7XG4gICAgICAgICAgY29udGVudDogZWxlbWVudC5maW5kKCcuc2hlbGYtcHJvcGVydGllcycpWzBdLFxuICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcuc2hlbGYtbGFiZWwnKVswXSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSBsZWZ0JyxcbiAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuZmllbGRJbmZvUG9wdXBDb250ZW50ID0gIGVsZW1lbnQuZmluZCgnLnNoZWxmLWZ1bmN0aW9ucycpWzBdO1xuXG4gICAgICAgIHNjb3BlLnJlbW92ZUZpZWxkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgUGlsbHMucmVtb3ZlKHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGREcmFnU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBQaWxscy5kcmFnU3RhcnQoUGlsbHMuZ2V0KHNjb3BlLmNoYW5uZWxJZCksIHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGREcmFnU3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIFBpbGxzLmRyYWdTdG9wKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIGRyb3BwaW5nIHBpbGwuXG4gICAgICAgICAqL1xuICAgICAgICBzY29wZS5maWVsZERyb3BwZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgcGlsbCA9IFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgIGlmIChmdW5jc1BvcHVwKSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB2YWxpZGF0ZSB0eXBlXG4gICAgICAgICAgdmFyIHR5cGVzID0gU2NoZW1hLnNjaGVtYS5kZWZpbml0aW9ucy5UeXBlLmVudW07XG4gICAgICAgICAgaWYgKCFfLmluY2x1ZGVzKHR5cGVzLCBwaWxsLnR5cGUpICYmICFjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhwaWxsLnR5cGUpKSB7XG4gICAgICAgICAgICAvLyBpZiBleGlzdGluZyB0eXBlIGlzIG5vdCBzdXBwb3J0ZWRcbiAgICAgICAgICAgIHBpbGwudHlwZSA9IHR5cGVzWzBdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgdGltZVVuaXQgLyBhZ2dyZWdhdGVcblxuICAgICAgICAgIFBpbGxzLmRyYWdEcm9wKHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZJRUxEX0RST1AsIHBpbGwpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnY2hhbm5lbElkJywgZnVuY3Rpb24oY2hhbm5lbElkKSB7XG4gICAgICAgICAgc2NvcGUuaXNBbnlDaGFubmVsID0gUGlsbHMuaXNBbnlDaGFubmVsKGNoYW5uZWxJZCk7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIC8vIEZJWE1FOiByZW1vdmUgdGhpcyBjb25mdXNpbmcgMi13YXkgYmluZGluZyBsb2dpY3NcbiAgICAgICAgLy8gSWYgc29tZSBleHRlcm5hbCBhY3Rpb24gY2hhbmdlcyB0aGUgZmllbGREZWYsIHdlIGFsc28gbmVlZCB0byB1cGRhdGUgdGhlIHBpbGxcbiAgICAgICAgc2NvcGUuJHdhdGNoKCdlbmNvZGluZ1tjaGFubmVsSWRdJywgZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICAvLyBQcmV2aWV3IHNoZWxmIHNob3VsZCBub3QgY2F1c2Ugc2lkZSBlZmZlY3RcbiAgICAgICAgICBpZiAoc2NvcGUucHJldmlldykge1xuICAgICAgICAgICAgc2NvcGUuaXNFbnVtZXJhdGVkRmllbGQgPSBQaWxscy5pc0VudW1lcmF0ZWRGaWVsZChzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgICAgc2NvcGUuaXNFbnVtZXJhdGVkQ2hhbm5lbCA9IFBpbGxzLmlzRW51bWVyYXRlZENoYW5uZWwoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgUGlsbHMuc2V0KHNjb3BlLmNoYW5uZWxJZCwgZmllbGREZWYgPyBfLmNsb25lRGVlcChmaWVsZERlZikgOiB7fSk7XG4gICAgICAgICAgICBzY29wZS5pc0FueUZpZWxkID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWMoZmllbGREZWYuZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoR3JvdXAoWydhbGxvd2VkQ2FzdGluZ1tEYXRhc2V0LnNjaGVtYS50eXBlKGVuY29kaW5nW2NoYW5uZWxJZF0uZmllbGQpXScsICdlbmNvZGluZ1tjaGFubmVsXS5hZ2dyZWdhdGUnXSwgZnVuY3Rpb24oYXJyKXtcbiAgICAgICAgICB2YXIgYWxsb3dlZFR5cGVzID0gYXJyWzBdLCBhZ2dyZWdhdGU9YXJyWzFdO1xuICAgICAgICAgIHNjb3BlLmFsbG93ZWRUeXBlcyA9IGFnZ3JlZ2F0ZSA9PT0gJ2NvdW50JyA/IFt2bC50eXBlLlFVQU5USVRBVElWRV0gOiBhbGxvd2VkVHlwZXM7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2ZpZWxkSW5mbycsIGZ1bmN0aW9uIChBTlksIERhdGFzZXQsIERyb3AsIHZsLCBjcWwsIGNvbnN0cywgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZmllbGRpbmZvL2ZpZWxkaW5mby5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGREZWY6ICc9JyxcbiAgICAgICAgc2hvd0FkZDogJz0nLFxuICAgICAgICBzaG93Q2FyZXQ6ICc9JyxcbiAgICAgICAgc2hvd0luZm86ICc9JyxcbiAgICAgICAgc2hvd1JlbW92ZTogJz0nLFxuICAgICAgICBzaG93VHlwZTogJz0nLFxuICAgICAgICBwb3B1cENvbnRlbnQ6ICc9JyxcblxuICAgICAgICBhY3Rpb246ICcmJyxcbiAgICAgICAgYWRkQWN0aW9uOiAnJicsXG4gICAgICAgIHJlbW92ZUFjdGlvbjogJyYnLFxuICAgICAgICBkaXNhYmxlQ291bnRDYXJldDogJz0nLFxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBmdW5jc1BvcHVwO1xuICAgICAgICBzY29wZS52bFR5cGUgPSB2bC50eXBlO1xuICAgICAgICBzY29wZS5pc0VudW1TcGVjID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWM7XG5cbiAgICAgICAgLy8gUHJvcGVydGllcyB0aGF0IGFyZSBjcmVhdGVkIGJ5IGEgd2F0Y2hlciBsYXRlclxuICAgICAgICBzY29wZS50eXBlTmFtZSA9IG51bGw7XG4gICAgICAgIHNjb3BlLmljb24gPSBudWxsO1xuICAgICAgICBzY29wZS5udWxsID0gbnVsbDtcblxuICAgICAgICBzY29wZS5jb250YWluc1R5cGUgPSBmdW5jdGlvbih0eXBlcywgdHlwZSkge1xuICAgICAgICAgIHJldHVybiBfLmluY2x1ZGVzKHR5cGVzLCB0eXBlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5jbGlja2VkID0gZnVuY3Rpb24oJGV2ZW50KXtcbiAgICAgICAgICBpZihzY29wZS5hY3Rpb24gJiYgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCcuZmEtY2FyZXQtZG93bicpWzBdICYmXG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJ3NwYW4udHlwZScpWzBdKSB7XG4gICAgICAgICAgICBzY29wZS5hY3Rpb24oJGV2ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZnVuYyA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgcmV0dXJuIGZpZWxkRGVmLmFnZ3JlZ2F0ZSB8fCBmaWVsZERlZi50aW1lVW5pdCB8fFxuICAgICAgICAgICAgKGZpZWxkRGVmLmJpbiAmJiAnYmluJykgfHxcbiAgICAgICAgICAgIGZpZWxkRGVmLl9hZ2dyZWdhdGUgfHwgZmllbGREZWYuX3RpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGREZWYuX2JpbiAmJiAnYmluJykgfHwgKGZpZWxkRGVmLl9hbnkgJiYgJ2F1dG8nKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ3BvcHVwQ29udGVudCcsIGZ1bmN0aW9uKHBvcHVwQ29udGVudCkge1xuICAgICAgICAgIGlmICghcG9wdXBDb250ZW50KSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgaWYgKGZ1bmNzUG9wdXApIHtcbiAgICAgICAgICAgIGZ1bmNzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmNzUG9wdXAgPSBuZXcgRHJvcCh7XG4gICAgICAgICAgICBjb250ZW50OiBwb3B1cENvbnRlbnQsXG4gICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnQuZmluZCgnLnR5cGUtY2FyZXQnKVswXSxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tIGxlZnQnLFxuICAgICAgICAgICAgb3Blbk9uOiAnY2xpY2snXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBUWVBFX05BTUVTID0ge1xuICAgICAgICAgIG5vbWluYWw6ICd0ZXh0JyxcbiAgICAgICAgICBvcmRpbmFsOiAndGV4dC1vcmRpbmFsJyxcbiAgICAgICAgICBxdWFudGl0YXRpdmU6ICdudW1iZXInLFxuICAgICAgICAgIHRlbXBvcmFsOiAndGltZScsXG4gICAgICAgICAgZ2VvZ3JhcGhpYzogJ2dlbydcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgVFlQRV9JQ09OUyA9IHtcbiAgICAgICAgICBub21pbmFsOiAnZmEtZm9udCcsXG4gICAgICAgICAgb3JkaW5hbDogJ2ZhLWZvbnQnLFxuICAgICAgICAgIHF1YW50aXRhdGl2ZTogJ2ljb24taGFzaCcsXG4gICAgICAgICAgdGVtcG9yYWw6ICdmYS1jYWxlbmRhcicsXG4gICAgICAgIH07XG4gICAgICAgIFRZUEVfSUNPTlNbQU5ZXSA9ICdmYS1hc3Rlcmlzayc7IC8vIHNlcGFyYXRlIGxpbmUgYmVjYXVzZSB3ZSBtaWdodCBjaGFuZ2Ugd2hhdCdzIHRoZSBzdHJpbmcgZm9yIEFOWVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFR5cGVEaWN0VmFsdWUodHlwZSwgZGljdCkge1xuICAgICAgICAgIGlmIChjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyh0eXBlKSkgeyAvLyBpcyBlbnVtU3BlY1xuICAgICAgICAgICAgdmFyIHZhbCA9IG51bGw7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUuZW51bS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICB2YXIgX3R5cGUgPSB0eXBlLmVudW1baV07XG4gICAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSBkaWN0W190eXBlXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsICE9PSBkaWN0W190eXBlXSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIEFOWTsgLy8gSWYgdGhlcmUgYXJlIG1hbnkgY29uZmxpY3RpbmcgdHlwZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBkaWN0W3R5cGVdO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoKCdmaWVsZERlZicsIGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgc2NvcGUuaWNvbiA9IGdldFR5cGVEaWN0VmFsdWUoZmllbGREZWYudHlwZSwgVFlQRV9JQ09OUyk7XG4gICAgICAgICAgc2NvcGUudHlwZU5hbWUgPSBnZXRUeXBlRGljdFZhbHVlKGZpZWxkRGVmLnR5cGUsIFRZUEVfTkFNRVMpO1xuICAgICAgICAgIGlmIChmaWVsZERlZi5maWVsZCAmJiBEYXRhc2V0LnNjaGVtYSkgeyAvLyBvbmx5IGNhbGN1bGF0ZSBzdGF0cyBpZiB3ZSBoYXZlIGZpZWxkIGF0dGFjaGVkIGFuZCBoYXZlIHNjaGVtYSByZWFkeVxuICAgICAgICAgICAgc2NvcGUuc3RhdHMgPSBEYXRhc2V0LnNjaGVtYS5zdGF0cyhmaWVsZERlZik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGZ1bmNzUG9wdXAgJiYgZnVuY3NQb3B1cC5kZXN0cm95KSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2Z1bmN0aW9uU2VsZWN0JywgZnVuY3Rpb24oXywgY29uc3RzLCB2bCwgUGlsbHMsIExvZ2dlciwgRGF0YXNldCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZnVuY3Rpb25zZWxlY3QvZnVuY3Rpb25zZWxlY3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhbm5lbElkOiAnPScsXG4gICAgICAgIGZpZWxkRGVmOiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSAvKixlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHZhciBCSU49J2JpbicsIENPVU5UPSdjb3VudCcsIG1heGJpbnM7XG5cbiAgICAgICAgc2NvcGUuZnVuYyA9IHtcbiAgICAgICAgICBzZWxlY3RlZDogdW5kZWZpbmVkLFxuICAgICAgICAgIGxpc3Q6IHtcbiAgICAgICAgICAgIGFib3ZlRm9sZDogW10sXG4gICAgICAgICAgICBiZWxvd0ZvbGQ6IFtdIC8vIGNvdWxkIGJlIGVtcHR5XG4gICAgICAgICAgfSxcbiAgICAgICAgICBpc1RlbXBvcmFsOiBmYWxzZSwgLy8gZm9yIG1ha2luZyBiZWxvd0ZvbGQgdGltZVVuaXRzIHNpbmdsZS1jb2x1bW5cbiAgICAgICAgICBpc0NvdW50OiBmYWxzZSAvLyBoaWRlIFwibW9yZVwiICYgXCJsZXNzXCIgdG9nZ2xlIGZvciBDT1VOVFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGZ1bmN0aW9ucyBmb3IgVCA9IHRpbWVVbml0cyArIHVuZGVmaW5lZFxuICAgICAgICB2YXIgdGVtcG9yYWxGdW5jdGlvbnMgPSB7XG4gICAgICAgICAgYWJvdmVGb2xkOiBbXG4gICAgICAgICAgICB1bmRlZmluZWQsICd5ZWFyJyxcbiAgICAgICAgICAgICdxdWFydGVyJywgJ21vbnRoJyxcbiAgICAgICAgICAgICdkYXRlJywnZGF5JyxcbiAgICAgICAgICAgICdob3VycycsICdtaW51dGVzJyxcbiAgICAgICAgICAgICdzZWNvbmRzJywgJ21pbGxpc2Vjb25kcycsXG4gICAgICAgICAgICAneWVhcm1vbnRoZGF0ZSdcbiAgICAgICAgICBdLFxuICAgICAgICAgIGJlbG93Rm9sZDogW1xuICAgICAgICAgICAgJ3llYXJxdWFydGVyJyxcbiAgICAgICAgICAgICd5ZWFybW9udGgnLFxuICAgICAgICAgICAgJ3llYXJtb250aGRhdGVob3VycycsXG4gICAgICAgICAgICAneWVhcm1vbnRoZGF0ZWhvdXJzbWludXRlcycsXG4gICAgICAgICAgICAneWVhcm1vbnRoZGF0ZWhvdXJzbWludXRlc3NlY29uZHMnLFxuICAgICAgICAgICAgJ2hvdXJzbWludXRlcycsXG4gICAgICAgICAgICAnaG91cnNtaW51dGVzc2Vjb25kcycsXG4gICAgICAgICAgICAnbWludXRlc3NlY29uZHMnLFxuICAgICAgICAgICAgJ3NlY29uZHNtaWxsaXNlY29uZHMnXG4gICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHRpbWVVbml0cyA9IFQgZnVuY3Rpb25zIC0gdW5kZWZpbmVkXG4gICAgICAgIHZhciB0aW1lVW5pdHMgPSBfLnB1bGwoXy5jb25jYXQodGVtcG9yYWxGdW5jdGlvbnMuYWJvdmVGb2xkLCB0ZW1wb3JhbEZ1bmN0aW9ucy5iZWxvd0ZvbGQpLCB1bmRlZmluZWQpO1xuXG4gICAgICAgIC8vIGZ1bmN0aW9ucyBmb3IgUSA9IGFnZ3JlZ2F0ZXMgKyBCSU4gKyB1bmRlZmluZWQgLSBDT1VOVFxuICAgICAgICB2YXIgcXVhbnRpdGF0aXZlRnVuY3Rpb25zID0ge1xuICAgICAgICAgIGFib3ZlRm9sZDogW1xuICAgICAgICAgICAgdW5kZWZpbmVkLCAnYmluJyxcbiAgICAgICAgICAgICdtaW4nLCAnbWF4JyxcbiAgICAgICAgICAgICdtZWFuJywgJ21lZGlhbicsXG4gICAgICAgICAgICAnc3VtJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgYmVsb3dGb2xkOiBbXG4gICAgICAgICAgICAndmFsaWQnLCAnbWlzc2luZycsXG4gICAgICAgICAgICAnZGlzdGluY3QnLCAnbW9kZXNrZXcnLFxuICAgICAgICAgICAgJ3ExJywgJ3EzJyxcbiAgICAgICAgICAgICdzdGRldicsICdzdGRldnAnLFxuICAgICAgICAgICAgJ3ZhcmlhbmNlJywgJ3ZhcmlhbmNlcCdcbiAgICAgICAgICBdIC8vIGhpZGUgQ09VTlQgZm9yIFEgaW4gdGhlIFVJIGJlY2F1c2Ugd2UgZGVkaWNhdGUgaXQgdG8gYSBzcGVjaWFsIFwiIyBDb3VudFwiIGZpZWxkXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYWdncmVnYXRlcyA9IFEgRnVuY3Rpb25zICsgQ09VTlQgLSBCSU4gLSB1bmRlZmluZWRcbiAgICAgICAgdmFyIGFnZ3JlZ2F0ZXMgPSBfLnB1bGwoXy5jb25jYXQocXVhbnRpdGF0aXZlRnVuY3Rpb25zLmFib3ZlRm9sZCwgcXVhbnRpdGF0aXZlRnVuY3Rpb25zLmJlbG93Rm9sZCwgW0NPVU5UXSksXG4gICAgICAgICAgQklOLCB1bmRlZmluZWQpO1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdENoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRlVOQ19DSEFOR0UsIHNjb3BlLmZ1bmMuc2VsZWN0ZWQpO1xuXG4gICAgICAgICAgdmFyIHNlbGVjdGVkRnVuYyA9IHNjb3BlLmZ1bmMuc2VsZWN0ZWQ7XG5cbiAgICAgICAgICB2YXIgb2xkUGlsbCA9IFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpLFxuICAgICAgICAgICAgcGlsbCA9IF8uY2xvbmUob2xkUGlsbCksXG4gICAgICAgICAgICB0eXBlID0gcGlsbCA/IHBpbGwudHlwZSA6ICcnLFxuICAgICAgICAgICAgaXNRID0gdHlwZSA9PT0gdmwudHlwZS5RVUFOVElUQVRJVkUsXG4gICAgICAgICAgICBpc1QgPSB0eXBlID09PSB2bC50eXBlLlRFTVBPUkFMO1xuXG4gICAgICAgICAgaWYoIXBpbGwpe1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub3QgcmVhZHlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyByZXNldCBmaWVsZCBkZWZcbiAgICAgICAgICAvLyBIQUNLOiB3ZSdyZSB0ZW1wb3JhcmlseSBzdG9yaW5nIHRoZSBtYXhiaW5zIGluIHRoZSBwaWxsXG4gICAgICAgICAgcGlsbC5iaW4gPSBzZWxlY3RlZEZ1bmMgPT09IEJJTiA/IHt9IDogdW5kZWZpbmVkO1xuICAgICAgICAgIHBpbGwuYWdncmVnYXRlID0gKGlzUSAmJiBhZ2dyZWdhdGVzLmluZGV4T2Yoc2VsZWN0ZWRGdW5jKSAhPT0gLTEpID8gc2VsZWN0ZWRGdW5jIDogdW5kZWZpbmVkO1xuICAgICAgICAgIHBpbGwudGltZVVuaXQgPSAoaXNUICYmIHRpbWVVbml0cy5pbmRleE9mKHNlbGVjdGVkRnVuYykgIT09IC0xKSA/IHNlbGVjdGVkRnVuYyA6IHVuZGVmaW5lZDtcblxuICAgICAgICAgIGlmKCFfLmlzRXF1YWwob2xkUGlsbCwgcGlsbCkpe1xuICAgICAgICAgICAgUGlsbHMuc2V0KHNjb3BlLmNoYW5uZWxJZCwgcGlsbCwgdHJ1ZSAvKiBwcm9wYWdhdGUgY2hhbmdlICovKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gd2hlbiBwYXJlbnQgb2JqZWN0cyBtb2RpZnkgdGhlIGZpZWxkXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnZmllbGREZWYnLCBmdW5jdGlvbihwaWxsKSB7XG4gICAgICAgICAgaWYgKCFwaWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHR5cGUgPSBwaWxsLmZpZWxkID8gcGlsbC50eXBlIDogJyc7XG5cbiAgICAgICAgICAvLyBoYWNrOiBzYXZlIHRoZSBtYXhiaW5zXG4gICAgICAgICAgaWYgKHBpbGwuYmluKSB7XG4gICAgICAgICAgICBtYXhiaW5zID0gcGlsbC5iaW4ubWF4YmlucztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgaXNPcmRpbmFsU2hlbGYgPSBbJ3JvdycsJ2NvbHVtbicsJ3NoYXBlJ10uaW5kZXhPZihzY29wZS5jaGFubmVsSWQpICE9PSAtMSxcbiAgICAgICAgICAgIGlzUSA9IHR5cGUgPT09IHZsLnR5cGUuUVVBTlRJVEFUSVZFLFxuICAgICAgICAgICAgaXNUID0gdHlwZSA9PT0gdmwudHlwZS5URU1QT1JBTDtcblxuICAgICAgICAgIC8vIGZvciBtYWtpbmcgYmVsb3dGb2xkIHRpbWVVbml0cyBzaW5nbGUtY29sdW1uXG4gICAgICAgICAgc2NvcGUuZnVuYy5pc1RlbXBvcmFsID0gaXNUO1xuXG4gICAgICAgICAgLy8gaGlkZSBcIm1vcmVcIiAmIFwibGVzc1wiIHRvZ2dsZXMgZm9yIENPVU5UXG4gICAgICAgICAgc2NvcGUuZnVuYy5pc0NvdW50ID0gcGlsbC5maWVsZCA9PT0gJyonO1xuXG4gICAgICAgICAgaWYocGlsbC5maWVsZCA9PT0gJyonICYmIHBpbGwuYWdncmVnYXRlID09PSBDT1VOVCl7XG4gICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYWJvdmVGb2xkPVtDT1VOVF07XG4gICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYmVsb3dGb2xkPVtdO1xuICAgICAgICAgICAgc2NvcGUuZnVuYy5zZWxlY3RlZCA9IENPVU5UO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBzdXBwb3J0ZWQgdHlwZSBiYXNlZCBvbiBwcmltaXRpdmUgZGF0YT9cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNhcmRpbmFsaXR5RmlsdGVyKHRpbWVVbml0KSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgJ2FueScgY2hhbm5lbCB0byAnPycuXG4gICAgICAgICAgICAgIHZhciBjaGFubmVsID0gUGlsbHMuaXNBbnlDaGFubmVsKHNjb3BlLmNoYW5uZWxJZCkgPyAnPycgOiBzY29wZS5jaGFubmVsSWQ7XG4gICAgICAgICAgICAgIHJldHVybiAhdGltZVVuaXQgfHwgLy8gRG9uJ3QgZmlsdGVyIHVuZGVmaW5lZC5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgdGltZVVuaXRzIHRoYXQgaGF2ZSBjYXJkaW5hbGl0eSA8PSAxLiBcbiAgICAgICAgICAgICAgICBEYXRhc2V0LnNjaGVtYS5jYXJkaW5hbGl0eSh7ZmllbGQ6IHBpbGwuZmllbGQsIGNoYW5uZWw6IGNoYW5uZWwsIHRpbWVVbml0OiB0aW1lVW5pdH0sIHRydWUsIHRydWUpID4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1QpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmFib3ZlRm9sZCA9IHRlbXBvcmFsRnVuY3Rpb25zLmFib3ZlRm9sZC5maWx0ZXIoY2FyZGluYWxpdHlGaWx0ZXIpO1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYmVsb3dGb2xkID0gdGVtcG9yYWxGdW5jdGlvbnMuYmVsb3dGb2xkLmZpbHRlcihjYXJkaW5hbGl0eUZpbHRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpc1EpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmFib3ZlRm9sZCA9IHF1YW50aXRhdGl2ZUZ1bmN0aW9ucy5hYm92ZUZvbGQ7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5iZWxvd0ZvbGQgPSBxdWFudGl0YXRpdmVGdW5jdGlvbnMuYmVsb3dGb2xkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZGVmYXVsdFZhbCA9IChpc09yZGluYWxTaGVsZiAmJlxuICAgICAgICAgICAgICAoaXNRICYmIEJJTikgfHwgKGlzVCAmJiBjb25zdHMuZGVmYXVsdFRpbWVGbilcbiAgICAgICAgICAgICkgfHwgdW5kZWZpbmVkO1xuXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSBwaWxsLmJpbiA/ICdiaW4nIDpcbiAgICAgICAgICAgICAgcGlsbC5hZ2dyZWdhdGUgfHwgcGlsbC50aW1lVW5pdDtcblxuICAgICAgICAgICAgaWYgKHNjb3BlLmZ1bmMubGlzdC5hYm92ZUZvbGQuaW5kZXhPZihzZWxlY3RlZCkgPj0gMCB8fCBzY29wZS5mdW5jLmxpc3QuYmVsb3dGb2xkLmluZGV4T2Yoc2VsZWN0ZWQpID49IDApIHtcbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5zZWxlY3RlZCA9IGRlZmF1bHRWYWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWwnLCBmdW5jdGlvbiAoJGRvY3VtZW50LCBNb2RhbHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL21vZGFsL21vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBhdXRvT3BlbjogJz0nLFxuICAgICAgICBtYXhXaWR0aDogJ0AnXG4gICAgICB9LFxuICAgICAgLy8gUHJvdmlkZSBhbiBpbnRlcmZhY2UgZm9yIGNoaWxkIGRpcmVjdGl2ZXMgdG8gY2xvc2UgdGhpcyBtb2RhbFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlKSB7XG4gICAgICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgIHZhciBtb2RhbElkID0gYXR0cnMuaWQ7XG5cbiAgICAgICAgaWYgKHNjb3BlLm1heFdpZHRoKSB7XG4gICAgICAgICAgc2NvcGUud3JhcHBlclN0eWxlID0gJ21heC13aWR0aDonICsgc2NvcGUubWF4V2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IHRvIGNsb3NlZCB1bmxlc3MgYXV0b09wZW4gaXMgc2V0XG4gICAgICAgIHNjb3BlLmlzT3BlbiA9IHNjb3BlLmF1dG9PcGVuO1xuXG4gICAgICAgIC8vIGNsb3NlIG9uIGVzY1xuICAgICAgICBmdW5jdGlvbiBlc2NhcGUoZSkge1xuICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDI3ICYmIHNjb3BlLmlzT3Blbikge1xuICAgICAgICAgICAgc2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYW5ndWxhci5lbGVtZW50KCRkb2N1bWVudCkub24oJ2tleWRvd24nLCBlc2NhcGUpO1xuXG4gICAgICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kYWwgd2l0aCB0aGUgc2VydmljZVxuICAgICAgICBNb2RhbHMucmVnaXN0ZXIobW9kYWxJZCwgc2NvcGUpO1xuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTW9kYWxzLmRlcmVnaXN0ZXIobW9kYWxJZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOm1vZGFsQ2xvc2VCdXR0b25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBtb2RhbENsb3NlQnV0dG9uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWxDbG9zZUJ1dHRvbicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl5tb2RhbCcsXG4gICAgICBzY29wZToge1xuICAgICAgICBjbG9zZUFjdGlvbjogJyYnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgc2NvcGUuY2xvc2VNb2RhbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIGlmIChzY29wZS5jbG9zZUFjdGlvbikge1xuICAgICAgICAgICAgc2NvcGUuY2xvc2VBY3Rpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuTW9kYWxzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgTW9kYWxzXG4gKiBTZXJ2aWNlIHVzZWQgdG8gY29udHJvbCBtb2RhbCB2aXNpYmlsaXR5IGZyb20gYW55d2hlcmUgaW4gdGhlIGFwcGxpY2F0aW9uXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ01vZGFscycsIGZ1bmN0aW9uICgkY2FjaGVGYWN0b3J5KSB7XG5cbiAgICAvLyBUT0RPOiBUaGUgdXNlIG9mIHNjb3BlIGhlcmUgYXMgdGhlIG1ldGhvZCBieSB3aGljaCBhIG1vZGFsIGRpcmVjdGl2ZVxuICAgIC8vIGlzIHJlZ2lzdGVyZWQgYW5kIGNvbnRyb2xsZWQgbWF5IG5lZWQgdG8gY2hhbmdlIHRvIHN1cHBvcnQgcmV0cmlldmluZ1xuICAgIC8vIGRhdGEgZnJvbSBhIG1vZGFsIGFzIG1heSBiZSBuZWVkZWQgaW4gIzc3XG4gICAgdmFyIG1vZGFsc0NhY2hlID0gJGNhY2hlRmFjdG9yeSgnbW9kYWxzJyk7XG5cbiAgICAvLyBQdWJsaWMgQVBJXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihpZCwgc2NvcGUpIHtcbiAgICAgICAgaWYgKG1vZGFsc0NhY2hlLmdldChpZCkpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdDYW5ub3QgcmVnaXN0ZXIgdHdvIG1vZGFscyB3aXRoIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsc0NhY2hlLnB1dChpZCwgc2NvcGUpO1xuICAgICAgfSxcblxuICAgICAgZGVyZWdpc3RlcjogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlKGlkKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIE9wZW4gYSBtb2RhbFxuICAgICAgb3BlbjogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSB0cnVlO1xuICAgICAgfSxcblxuICAgICAgLy8gQ2xvc2UgYSBtb2RhbFxuICAgICAgY2xvc2U6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBtb2RhbFNjb3BlID0gbW9kYWxzQ2FjaGUuZ2V0KGlkKTtcbiAgICAgICAgaWYgKCFtb2RhbFNjb3BlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignVW5yZWdpc3RlcmVkIG1vZGFsIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsU2NvcGUuaXNPcGVuID0gZmFsc2U7XG4gICAgICB9LFxuXG4gICAgICBlbXB0eTogZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vZGFsc0NhY2hlLnJlbW92ZUFsbCgpO1xuICAgICAgfSxcblxuICAgICAgY291bnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kYWxzQ2FjaGUuaW5mbygpLnNpemU7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTpwcm9wZXJ0eUVkaXRvclxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHByb3BlcnR5RWRpdG9yXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgncHJvcGVydHlFZGl0b3InLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9wcm9wZXJ0eWVkaXRvci9wcm9wZXJ0eWVkaXRvci5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBpZDogJz0nLFxuICAgICAgICB0eXBlOiAnPScsXG4gICAgICAgIGVudW06ICc9JyxcbiAgICAgICAgcHJvcE5hbWU6ICc9JyxcbiAgICAgICAgZ3JvdXA6ICc9JyxcbiAgICAgICAgZGVzY3JpcHRpb246ICc9JyxcbiAgICAgICAgZGVmYXVsdDogJz0nLFxuICAgICAgICBtaW46ICc9JyxcbiAgICAgICAgbWF4OiAnPScsXG4gICAgICAgIHJvbGU6ICc9JyAvLyBmb3IgZXhhbXBsZSAnY29sb3InXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuaGFzQXV0byA9IHNjb3BlLmRlZmF1bHQgPT09IHVuZGVmaW5lZDtcblxuICAgICAgICAvL1RPRE8oa2FuaXR3KTogY29uc2lkZXIgcmVuYW1pbmdcbiAgICAgICAgc2NvcGUuYXV0b21vZGVsID0geyB2YWx1ZTogZmFsc2UgfTtcblxuICAgICAgICBpZiAoc2NvcGUuaGFzQXV0bykge1xuICAgICAgICAgIHNjb3BlLmF1dG9tb2RlbC52YWx1ZSA9IHNjb3BlLmdyb3VwW3Njb3BlLnByb3BOYW1lXSA9PT0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgLy8gY2hhbmdlIHRoZSB2YWx1ZSB0byB1bmRlZmluZWQgaWYgYXV0byBpcyB0cnVlXG4gICAgICAgICAgc2NvcGUuJHdhdGNoKCdhdXRvbW9kZWwudmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChzY29wZS5hdXRvbW9kZWwudmFsdWUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZ3JvdXBbc2NvcGUucHJvcE5hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUuaXNSYW5nZSA9IHNjb3BlLm1heCAhPT0gdW5kZWZpbmVkICYmIHNjb3BlLm1pbiAhPT0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3NjaGVtYUxpc3QnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBvcmRlckJ5OiAnPScsXG4gICAgICAgIGZpZWxkRGVmczogJz0nLFxuICAgICAgICBzaG93QWRkOiAnPSdcbiAgICAgIH0sXG4gICAgICByZXBsYWNlOiB0cnVlXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgcG9sZXN0YXIuZGlyZWN0aXZlOnNjaGVtYUxpc3RJdGVtXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgc2NoZW1hTGlzdEl0ZW1cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdzY2hlbWFMaXN0SXRlbScsIGZ1bmN0aW9uIChQaWxscywgY3FsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3RpdGVtLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGREZWY6ICc9JyxcbiAgICAgICAgc2hvd0FkZDogICc9JyxcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSkge1xuICAgICAgICBzY29wZS5pc0VudW1TcGVjID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWM7XG5cbiAgICAgICAgc2NvcGUuZmllbGRBZGQgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgICAgIFBpbGxzLmFkZChmaWVsZERlZik7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGREcmFnU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzY29wZS5maWVsZERlZjtcblxuICAgICAgICAgIHNjb3BlLnBpbGwgPSB7XG4gICAgICAgICAgICBmaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICB0aXRsZTogZmllbGREZWYudGl0bGUsXG4gICAgICAgICAgICB0eXBlOiBmaWVsZERlZi50eXBlLFxuICAgICAgICAgICAgYWdncmVnYXRlOiBmaWVsZERlZi5hZ2dyZWdhdGVcbiAgICAgICAgICB9O1xuICAgICAgICAgIFBpbGxzLmRyYWdTdGFydChzY29wZS5waWxsLCBudWxsKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZERyYWdTdG9wID0gUGlsbHMuZHJhZ1N0b3A7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3NoZWx2ZXMnLCBmdW5jdGlvbigpIHtcblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvc2hlbHZlcy9zaGVsdmVzLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHNwZWM6ICc9JyxcbiAgICAgICAgcHJldmlldzogJz0nLFxuICAgICAgICBzdXBwb3J0QW55OiAnPSdcbiAgICAgIH0sXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBBTlksIHV0aWwsIHZsLCBDb25maWcsIERhdGFzZXQsIExvZ2dlciwgUGlsbHMpIHtcbiAgICAgICAgJHNjb3BlLkFOWSA9IEFOWTtcbiAgICAgICAgJHNjb3BlLmFueUNoYW5uZWxJZHMgPSBbXTtcblxuICAgICAgICAkc2NvcGUubWFya3MgPSBbJ3BvaW50JywgJ3RpY2snLCAnYmFyJywgJ2xpbmUnLCAnYXJlYScsICd0ZXh0J107XG4gICAgICAgICRzY29wZS5tYXJrc1dpdGhBbnkgPSBbQU5ZXS5jb25jYXQoJHNjb3BlLm1hcmtzKTtcblxuICAgICAgICAkc2NvcGUubWFya0NoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5NQVJLX0NIQU5HRSwgJHNjb3BlLnNwZWMubWFyayk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgdmwuc3BlYy50cmFuc3Bvc2UoJHNjb3BlLnNwZWMpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jbGVhciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNQRUNfQ0xFQU4sIG51bGwpO1xuICAgICAgICAgIFBpbGxzLnJlc2V0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaCgnc3BlYycsIGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICAvLyBwb3B1bGF0ZSBhbnlDaGFubmVsSWRzIHNvIHdlIHNob3cgYWxsIG9yIHRoZW1cbiAgICAgICAgICBpZiAoJHNjb3BlLnN1cHBvcnRBbnkpIHtcbiAgICAgICAgICAgICRzY29wZS5hbnlDaGFubmVsSWRzID0gdXRpbC5rZXlzKHNwZWMuZW5jb2RpbmcpLnJlZHVjZShmdW5jdGlvbihhbnlDaGFubmVsSWRzLCBjaGFubmVsSWQpIHtcbiAgICAgICAgICAgICAgaWYgKFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpKSB7XG4gICAgICAgICAgICAgICAgYW55Q2hhbm5lbElkcy5wdXNoKGNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIGFueUNoYW5uZWxJZHM7XG4gICAgICAgICAgICB9LCBbXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE9ubHkgY2FsbCBQaWxscy51cGRhdGUsIHdoaWNoIHdpbGwgdHJpZ2dlciBTcGVjLnNwZWMgdG8gdXBkYXRlIGlmIGl0J3Mgbm90IGEgcHJldmlldy5cbiAgICAgICAgICBpZiAoISRzY29wZS5wcmV2aWV3KSB7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU1BFQ19DSEFOR0UsIHNwZWMpO1xuICAgICAgICAgICAgUGlsbHMudXBkYXRlKHNwZWMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7IC8vLCB0cnVlIC8qIHdhdGNoIGVxdWFsaXR5IHJhdGhlciB0aGFuIHJlZmVyZW5jZSAqLyk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFiXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFiXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFiJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90YWJzL3RhYi5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl50YWJzZXQnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoZWFkaW5nOiAnQCdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIHRhYnNldENvbnRyb2xsZXIpIHtcbiAgICAgICAgdGFic2V0Q29udHJvbGxlci5hZGRUYWIoc2NvcGUpO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnRhYnNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHRhYnNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3RhYnNldCcsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdGFicy90YWJzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcblxuICAgICAgLy8gSW50ZXJmYWNlIGZvciB0YWJzIHRvIHJlZ2lzdGVyIHRoZW1zZWx2ZXNcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50YWJzID0gW107XG5cbiAgICAgICAgdGhpcy5hZGRUYWIgPSBmdW5jdGlvbih0YWJTY29wZSkge1xuICAgICAgICAgIC8vIEZpcnN0IHRhYiBpcyBhbHdheXMgYXV0by1hY3RpdmF0ZWQ7IG90aGVycyBhdXRvLWRlYWN0aXZhdGVkXG4gICAgICAgICAgdGFiU2NvcGUuYWN0aXZlID0gc2VsZi50YWJzLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgICBzZWxmLnRhYnMucHVzaCh0YWJTY29wZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zaG93VGFiID0gZnVuY3Rpb24oc2VsZWN0ZWRUYWIpIHtcbiAgICAgICAgICBzZWxmLnRhYnMuZm9yRWFjaChmdW5jdGlvbih0YWIpIHtcbiAgICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBzZWxlY3RlZCB0YWIsIGRlYWN0aXZhdGUgYWxsIG90aGVyc1xuICAgICAgICAgICAgdGFiLmFjdGl2ZSA9IHRhYiA9PT0gc2VsZWN0ZWRUYWI7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9LFxuXG4gICAgICAvLyBFeHBvc2UgY29udHJvbGxlciB0byB0ZW1wbGF0ZXMgYXMgXCJ0YWJzZXRcIlxuICAgICAgY29udHJvbGxlckFzOiAndGFic2V0J1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdCcsIGZ1bmN0aW9uKHZsLCB2ZywgY3FsLCAkdGltZW91dCwgJHEsIERhdGFzZXQsIENvbmZpZywgY29uc3RzLCBfLCAkZG9jdW1lbnQsIExvZ2dlciwgSGVhcCwgJHdpbmRvdykge1xuICAgIHZhciBjb3VudGVyID0gMDtcbiAgICB2YXIgTUFYX0NBTlZBU19TSVpFID0gMzI3NjcvMiwgTUFYX0NBTlZBU19BUkVBID0gMjY4NDM1NDU2LzQ7XG5cbiAgICB2YXIgcmVuZGVyUXVldWUgPSBuZXcgSGVhcChmdW5jdGlvbihhLCBiKXtcbiAgICAgICAgcmV0dXJuIGEucHJpb3JpdHkgLSBiLnByaW9yaXR5O1xuICAgICAgfSksXG4gICAgICByZW5kZXJpbmcgPSBmYWxzZTtcblxuICAgIGZ1bmN0aW9uIGdldFJlbmRlcmVyKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgIC8vIHVzZSBjYW52YXMgYnkgZGVmYXVsdCBidXQgdXNlIHN2ZyBpZiB0aGUgdmlzdWFsaXphdGlvbiBpcyB0b28gYmlnXG4gICAgICBpZiAod2lkdGggPiBNQVhfQ0FOVkFTX1NJWkUgfHwgaGVpZ2h0ID4gTUFYX0NBTlZBU19TSVpFIHx8IHdpZHRoKmhlaWdodCA+IE1BWF9DQU5WQVNfQVJFQSkge1xuICAgICAgICByZXR1cm4gJ3N2Zyc7XG4gICAgICB9XG4gICAgICByZXR1cm4gJ2NhbnZhcyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy92bHBsb3QvdmxwbG90Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJz0nLFxuICAgICAgICAvKiogQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgaWYgdGhlIHBsb3QgaXMgc3RpbGwgaW4gdGhlIHZpZXcsIHNvIGl0IG1pZ2h0IGJlIG9taXR0ZWQgZnJvbSB0aGUgcmVuZGVyIHF1ZXVlIGlmIG5lY2Vzc2FyeS4gKi9cbiAgICAgICAgaXNJbkxpc3Q6ICc9JyxcblxuICAgICAgICBhbHdheXNTY3JvbGxhYmxlOiAnPScsXG4gICAgICAgIGNvbmZpZ1NldDogJ0AnLFxuICAgICAgICBtYXhIZWlnaHQ6Jz0nLFxuICAgICAgICBtYXhXaWR0aDogJz0nLFxuICAgICAgICBvdmVyZmxvdzogJz0nLFxuICAgICAgICBwcmlvcml0eTogJz0nLFxuICAgICAgICByZXNjYWxlOiAnPScsXG4gICAgICAgIHRodW1ibmFpbDogJz0nLFxuICAgICAgICB0b29sdGlwOiAnPScsXG4gICAgICB9LFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBIT1ZFUl9USU1FT1VUID0gNTAwLFxuICAgICAgICAgIFRPT0xUSVBfVElNRU9VVCA9IDI1MDtcblxuICAgICAgICBzY29wZS52aXNJZCA9IChjb3VudGVyKyspO1xuICAgICAgICBzY29wZS5ob3ZlclByb21pc2UgPSBudWxsO1xuICAgICAgICBzY29wZS50b29sdGlwUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUudG9vbHRpcEFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICBzY29wZS5kZXN0cm95ZWQgPSBmYWxzZTtcblxuICAgICAgICB2YXIgZm9ybWF0ID0gdmcudXRpbC5mb3JtYXQubnVtYmVyKCcnKTtcblxuICAgICAgICBzY29wZS5tb3VzZW92ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5ob3ZlclByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX01PVVNFT1ZFUiwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcbiAgICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSAhc2NvcGUudGh1bWJuYWlsO1xuICAgICAgICAgIH0sIEhPVkVSX1RJTUVPVVQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLm1vdXNlb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmhvdmVyRm9jdXMpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9VVCwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAkdGltZW91dC5jYW5jZWwoc2NvcGUuaG92ZXJQcm9taXNlKTtcbiAgICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gc2NvcGUudW5sb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiB2aWV3T25Nb3VzZU92ZXIoZXZlbnQsIGl0ZW0pIHtcbiAgICAgICAgICBpZiAoIWl0ZW0gfHwgIWl0ZW0uZGF0dW0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzY29wZS50b29sdGlwUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uIGFjdGl2YXRlVG9vbHRpcCgpe1xuXG4gICAgICAgICAgICAvLyBhdm9pZCBzaG93aW5nIHRvb2x0aXAgZm9yIGZhY2V0J3MgYmFja2dyb3VuZFxuICAgICAgICAgICAgaWYgKGl0ZW0uZGF0dW0uX2ZhY2V0SUQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS50b29sdGlwQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQLCBpdGVtLmRhdHVtLCB7XG4gICAgICAgICAgICAgIHNob3J0aGFuZDogc2NvcGUuY2hhcnQuc2hvcnRoYW5kXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gY29udmVydCBkYXRhIGludG8gYSBmb3JtYXQgdGhhdCB3ZSBjYW4gZWFzaWx5IHVzZSB3aXRoIG5nIHRhYmxlIGFuZCBuZy1yZXBlYXRcbiAgICAgICAgICAgIC8vIFRPRE86IHJldmlzZSBpZiB0aGlzIGlzIGFjdHVhbGx5IGEgZ29vZCBpZGVhXG4gICAgICAgICAgICBzY29wZS5kYXRhID0gXyhpdGVtLmRhdHVtKS5vbWl0KCdfcHJldicsICdfaWQnKSAvLyBvbWl0IHZlZ2EgaW50ZXJuYWxzXG4gICAgICAgICAgICAgIC50b1BhaXJzKCkudmFsdWUoKVxuICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKHApIHtcbiAgICAgICAgICAgICAgICBwWzFdID0gdmcudXRpbC5pc051bWJlcihwWzFdKSA/IGZvcm1hdChwWzFdKSA6IHBbMV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHA7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuXG4gICAgICAgICAgICB2YXIgdG9vbHRpcCA9IGVsZW1lbnQuZmluZCgnLnZpcy10b29sdGlwJyksXG4gICAgICAgICAgICAgICRib2R5ID0gYW5ndWxhci5lbGVtZW50KCRkb2N1bWVudCksXG4gICAgICAgICAgICAgIHdpZHRoID0gdG9vbHRpcC53aWR0aCgpLFxuICAgICAgICAgICAgICBoZWlnaHQ9IHRvb2x0aXAuaGVpZ2h0KCk7XG5cbiAgICAgICAgICAgIC8vIHB1dCB0b29sdGlwIGFib3ZlIGlmIGl0J3MgbmVhciB0aGUgc2NyZWVuJ3MgYm90dG9tIGJvcmRlclxuICAgICAgICAgICAgaWYgKGV2ZW50LnBhZ2VZKzEwK2hlaWdodCA8ICRib2R5LmhlaWdodCgpKSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCAoZXZlbnQucGFnZVkrMTApKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCAoZXZlbnQucGFnZVktMTAtaGVpZ2h0KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHB1dCB0b29sdGlwIG9uIGxlZnQgaWYgaXQncyBuZWFyIHRoZSBzY3JlZW4ncyByaWdodCBib3JkZXJcbiAgICAgICAgICAgIGlmIChldmVudC5wYWdlWCsxMCsgd2lkdGggPCAkYm9keS53aWR0aCgpKSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgKGV2ZW50LnBhZ2VYKzEwKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygnbGVmdCcsIChldmVudC5wYWdlWC0xMC13aWR0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIFRPT0xUSVBfVElNRU9VVCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB2aWV3T25Nb3VzZU91dChldmVudCwgaXRlbSkge1xuICAgICAgICAgIC8vY2xlYXIgcG9zaXRpb25zXG4gICAgICAgICAgdmFyIHRvb2x0aXAgPSBlbGVtZW50LmZpbmQoJy52aXMtdG9vbHRpcCcpO1xuICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCBudWxsKTtcbiAgICAgICAgICB0b29sdGlwLmNzcygnbGVmdCcsIG51bGwpO1xuICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChzY29wZS50b29sdGlwUHJvbWlzZSk7XG4gICAgICAgICAgaWYgKHNjb3BlLnRvb2x0aXBBY3RpdmUpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQX0VORCwgaXRlbS5kYXR1bSwge1xuICAgICAgICAgICAgICBzaG9ydGhhbmQ6IHNjb3BlLmNoYXJ0LnNob3J0aGFuZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICBzY29wZS5kYXRhID0gW107XG4gICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmdTcGVjKCkge1xuICAgICAgICAgIHZhciBjb25maWdTZXQgPSBzY29wZS5jb25maWdTZXQgfHwgY29uc3RzLmRlZmF1bHRDb25maWdTZXQgfHwge307XG5cbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LnZsU3BlYykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB2bFNwZWMgPSBfLmNsb25lRGVlcChzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIHZnLnV0aWwuZXh0ZW5kKHZsU3BlYy5jb25maWcsIENvbmZpZ1tjb25maWdTZXRdKCkpO1xuICAgICAgICAgIHJldHVybiB2bC5jb21waWxlKHZsU3BlYykuc3BlYztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZpc0VsZW1lbnQoKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc2NhbGVJZkVuYWJsZSgpIHtcbiAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGdldFZpc0VsZW1lbnQoKTtcbiAgICAgICAgICBpZiAoc2NvcGUucmVzY2FsZSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byBkaWdlc3QgdGhlIHNjb3BlIHRvIGVuc3VyZSB0aGF0XG4gICAgICAgICAgICAvLyBlbGVtZW50LndpZHRoKCkgaXMgYm91bmQgYnkgcGFyZW50IGVsZW1lbnQhXG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB4UmF0aW8gPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAwLjIsXG4gICAgICAgICAgICAgICAgZWxlbWVudC53aWR0aCgpIC8gIC8qIHdpZHRoIG9mIHZscGxvdCBib3VuZGluZyBib3ggKi9cbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCAvKiB3aWR0aCBvZiB0aGUgdmlzICovXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICh4UmF0aW8gPCAxKSB7XG4gICAgICAgICAgICAgIHZpc0VsZW1lbnQud2lkdGgoc2NvcGUud2lkdGggKiB4UmF0aW8pXG4gICAgICAgICAgICAgICAgICAgICAgICAuaGVpZ2h0KHNjb3BlLmhlaWdodCAqIHhSYXRpbyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlzRWxlbWVudC5jc3MoJ3RyYW5zZm9ybScsIG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgLmNzcygndHJhbnNmb3JtLW9yaWdpbicsIG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNob3J0aGFuZCgpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuY2hhcnQuc2hvcnRoYW5kIHx8IChzY29wZS5jaGFydC52bFNwZWMgPyBjcWwucXVlcnkuc2hvcnRoYW5kLnZsU3BlYyhzY29wZS5jaGFydC52bFNwZWMpIDogJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyUXVldWVOZXh0KCkge1xuICAgICAgICAgIC8vIHJlbmRlciBuZXh0IGl0ZW0gaW4gdGhlIHF1ZXVlXG4gICAgICAgICAgaWYgKHJlbmRlclF1ZXVlLnNpemUoKSA+IDApIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gcmVuZGVyUXVldWUucG9wKCk7XG4gICAgICAgICAgICBuZXh0LnBhcnNlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG9yIHNheSB0aGF0IG5vIG9uZSBpcyByZW5kZXJpbmdcbiAgICAgICAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbmRlcihzcGVjKSB7XG4gICAgICAgICAgaWYgKCFzcGVjKSB7XG4gICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdmVyJyk7XG4gICAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNjb3BlLmhlaWdodCA9IHNwZWMuaGVpZ2h0O1xuICAgICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignY2FuIG5vdCBmaW5kIHZpcyBlbGVtZW50Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHNob3J0aGFuZCA9IGdldFNob3J0aGFuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gcGFyc2VWZWdhKCkge1xuICAgICAgICAgICAgLy8gaWYgbm8gbG9uZ2VyIGEgcGFydCBvZiB0aGUgbGlzdCwgY2FuY2VsIVxuICAgICAgICAgICAgaWYgKHNjb3BlLmRlc3Ryb3llZCB8fCBzY29wZS5kaXNhYmxlZCB8fCAoc2NvcGUuaXNJbkxpc3QgJiYgc2NvcGUuY2hhcnQuZmllbGRTZXRLZXkgJiYgIXNjb3BlLmlzSW5MaXN0KHNjb3BlLmNoYXJ0KSkpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbmNlbCByZW5kZXJpbmcnLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHQoKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIC8vIHJlbmRlciBpZiBzdGlsbCBhIHBhcnQgb2YgdGhlIGxpc3RcbiAgICAgICAgICAgIHZnLnBhcnNlLnNwZWMoc3BlYywgZnVuY3Rpb24oZXJyb3IsIGNoYXJ0KSB7XG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KHJlbmRlclF1ZXVlTmV4dCwgMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGVuZFBhcnNlID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgICAgICAgdmlldyA9IGNoYXJ0KHtlbDogZWxlbWVudFswXX0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjb25zdHMudXNlVXJsKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3LmRhdGEoe3JhdzogRGF0YXNldC5kYXRhfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmlldy51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICAvLyByZWFkIHdpZHRoIC8gaGVpZ2h0IGZyb20gbGF5b3V0XG4gICAgICAgICAgICAgICAgdmFyIGxheW91dCA9IHZpZXcuZGF0YSgnbGF5b3V0JykudmFsdWVzKClbMF07XG4gICAgICAgICAgICAgICAgdmFyIHJlbmRlcmVyID0gZ2V0UmVuZGVyZXIobGF5b3V0LndpZHRoLCBsYXlvdXQuaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBpZiAocmVuZGVyZXIgPT09ICdzdmcnKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcmVyKHJlbmRlcmVyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgICAgICAgICAvLyByZWFkICA8Y2FudmFzPi88c3ZnPuKAmXMgd2lkdGggYW5kIGhlaWdodCwgd2hpY2ggaXMgdmVnYSdzIG91dGVyIHdpZHRoIGFuZCBoZWlnaHQgdGhhdCBpbmNsdWRlcyBheGVzIGFuZCBsZWdlbmRzXG4gICAgICAgICAgICAgICAgc2NvcGUud2lkdGggPSAgdmlzRWxlbWVudC53aWR0aCgpO1xuICAgICAgICAgICAgICAgIHNjb3BlLmhlaWdodCA9IHZpc0VsZW1lbnQuaGVpZ2h0KCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnKSB7XG4gICAgICAgICAgICAgICAgICAkd2luZG93LnZpZXdzID0gJHdpbmRvdy52aWV3cyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cudmlld3Nbc2hvcnRoYW5kXSA9IHZpZXc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1JFTkRFUiwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgICByZXNjYWxlSWZFbmFibGUoKTtcblxuICAgICAgICAgICAgICAgIHZhciBlbmRDaGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJzZSBzcGVjJywgKGVuZFBhcnNlLXN0YXJ0KSwgJ2NoYXJ0aW5nJywgKGVuZENoYXJ0LWVuZFBhcnNlKSwgc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUudG9vbHRpcCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5vbignbW91c2VvdmVyJywgdmlld09uTW91c2VPdmVyKTtcbiAgICAgICAgICAgICAgICAgIHZpZXcub24oJ21vdXNlb3V0Jywgdmlld09uTW91c2VPdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICR0aW1lb3V0KHJlbmRlclF1ZXVlTmV4dCwgMSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFyZW5kZXJpbmcpIHsgLy8gaWYgbm8gaW5zdGFuY2UgaXMgYmVpbmcgcmVuZGVyIC0tIHJlbmRlcmluZyBub3dcbiAgICAgICAgICAgIHJlbmRlcmluZz10cnVlO1xuICAgICAgICAgICAgcGFyc2VWZWdhKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBxdWV1ZSBpdFxuICAgICAgICAgICAgcmVuZGVyUXVldWUucHVzaCh7XG4gICAgICAgICAgICAgIHByaW9yaXR5OiBzY29wZS5wcmlvcml0eSB8fCAwLFxuICAgICAgICAgICAgICBwYXJzZTogcGFyc2VWZWdhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlldztcbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIE9taXQgZGF0YSBwcm9wZXJ0eSB0byBzcGVlZCB1cCBkZWVwIHdhdGNoXG4gICAgICAgICAgcmV0dXJuIF8ub21pdChzY29wZS5jaGFydC52bFNwZWMsICdkYXRhJyk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzcGVjID0gc2NvcGUuY2hhcnQudmdTcGVjID0gZ2V0VmdTcGVjKCk7XG4gICAgICAgICAgaWYgKCFzY29wZS5jaGFydC5jbGVhblNwZWMpIHtcbiAgICAgICAgICAgIC8vIEZJWE1FXG4gICAgICAgICAgICBzY29wZS5jaGFydC5jbGVhblNwZWMgPSBzY29wZS5jaGFydC52bFNwZWM7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbmRlcihzcGVjKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd2bHBsb3QgZGVzdHJveWVkJyk7XG4gICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcbiAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnICYmICR3aW5kb3cudmlld3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgICAvLyBGSVhNRSBhbm90aGVyIHdheSB0aGF0IHNob3VsZCBlbGltaW5hdGUgdGhpbmdzIGZyb20gbWVtb3J5IGZhc3RlciBzaG91bGQgYmUgcmVtb3ZpbmdcbiAgICAgICAgICAvLyBtYXliZSBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgIC8vIHJlbmRlclF1ZXVlLnNwbGljZShyZW5kZXJRdWV1ZS5pbmRleE9mKHBhcnNlVmVnYSksIDEpKTtcbiAgICAgICAgICAvLyBidXQgd2l0aG91dCBwcm9wZXIgdGVzdGluZywgdGhpcyBpcyByaXNraWVyIHRoYW4gc2V0dGluZyBzY29wZS5kZXN0cm95ZWQuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwJywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCB2ZywgdmwsIERhdGFzZXQsIExvZ2dlciwgXywgUGlsbHMsIENoYXJ0LCAkdGltZW91dCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5nZXREcm9wVGFyZ2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuICRlbGVtZW50LmZpbmQoJy5mYS13cmVuY2gnKVswXTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBzY29wZToge1xuICAgICAgICAvKiBwYXNzIHRvIHZscGxvdCAqKi9cbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPScsXG4gICAgICAgIGlzSW5MaXN0OiAnPScsXG5cbiAgICAgICAgYWx3YXlzU2Nyb2xsYWJsZTogJz0nLFxuICAgICAgICBjb25maWdTZXQ6ICdAJyxcbiAgICAgICAgZW5hYmxlUGlsbHNQcmV2aWV3OiAnPScsXG4gICAgICAgIG1heEhlaWdodDogJz0nLFxuICAgICAgICBtYXhXaWR0aDogJz0nLFxuICAgICAgICBvdmVyZmxvdzogJz0nLFxuICAgICAgICBwcmlvcml0eTogJz0nLFxuICAgICAgICByZXNjYWxlOiAnPScsXG4gICAgICAgIHRodW1ibmFpbDogJz0nLFxuICAgICAgICB0b29sdGlwOiAnPScsXG5cbiAgICAgICAgLyogdmxwbG90Z3JvdXAgc3BlY2lmaWMgKi9cblxuICAgICAgICAvKiogU2V0IG9mIGZpZWxkRGVmcyBmb3Igc2hvd2luZyBmaWVsZCBpbmZvLiAgRm9yIFZveWFnZXIyLCB0aGlzIG1pZ2h0IGJlIGp1c3QgYSBzdWJzZXQgb2YgZmllbGRzIHRoYXQgYXJlIGFtYmlndW91cy4gKi9cbiAgICAgICAgZmllbGRTZXQ6ICc9JyxcblxuICAgICAgICBzaG93Qm9va21hcms6ICdAJyxcbiAgICAgICAgc2hvd0RlYnVnOiAnPScsXG4gICAgICAgIHNob3dFeHBhbmQ6ICc9JyxcbiAgICAgICAgc2hvd0ZpbHRlck51bGw6ICdAJyxcbiAgICAgICAgc2hvd0xhYmVsOiAnQCcsXG4gICAgICAgIHNob3dMb2c6ICdAJyxcbiAgICAgICAgc2hvd1NlbGVjdDogJ0AnLFxuICAgICAgICBzaG93U29ydDogJ0AnLFxuICAgICAgICBzaG93VHJhbnNwb3NlOiAnQCcsXG5cbiAgICAgICAgLyoqIFdoZXRoZXIgdGhlIGxvZyAvIHRyYW5zcG9zZSBzb3J0IGNhdXNlIHNpZGUgZWZmZWN0IHRvIHRoZSBzaGVsZiAgKi9cbiAgICAgICAgdG9nZ2xlU2hlbGY6ICc9JyxcblxuICAgICAgICBhbHdheXNTZWxlY3RlZDogJz0nLFxuICAgICAgICBpc1NlbGVjdGVkOiAnPScsXG4gICAgICAgIGhpZ2hsaWdodGVkOiAnPScsXG4gICAgICAgIGV4cGFuZEFjdGlvbjogJyYnLFxuICAgICAgICBzZWxlY3RBY3Rpb246ICcmJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICBzY29wZS5ob3ZlcmVkID0gZmFsc2U7XG5cbiAgICAgICAgLy8gYm9va21hcmsgYWxlcnRcbiAgICAgICAgc2NvcGUuc2hvd0Jvb2ttYXJrQWxlcnQgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUudG9nZ2xlQm9va21hcmsgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgIGlmIChCb29rbWFya3MuaXNCb29rbWFya2VkKGNoYXJ0LnNob3J0aGFuZCkpIHtcbiAgICAgICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gIXNjb3BlLnNob3dCb29rbWFya0FsZXJ0OyAvLyB0b2dnbGUgYWxlcnRcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBCb29rbWFya3MuYWRkKGNoYXJ0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGhvdmVyUHJvbWlzZSA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUuZmllbGRJbmZvTW91c2VvdmVyID0gZnVuY3Rpb24oZmllbGREZWYsIGluZGV4KSB7XG4gICAgICAgICAgc2NvcGUuaG92ZXJlZCA9IHRydWU7XG5cbiAgICAgICAgICBob3ZlclByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIChzY29wZS5oaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIExpbmsgdG8gb3JpZ2luYWwgZmllbGQgaW4gdGhlIENRTC1iYXNlZCBzcGVjXG4gICAgICAgICAgICBpZiAoc2NvcGUuY2hhcnQuZW51bVNwZWNJbmRleCkge1xuICAgICAgICAgICAgICB2YXIgZW51bVNwZWNJbmRleCA9IHNjb3BlLmNoYXJ0LmVudW1TcGVjSW5kZXg7XG4gICAgICAgICAgICAgIGlmIChlbnVtU3BlY0luZGV4LmVuY29kaW5ncyAmJiBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0gJiYgZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmZpZWxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkRW51bVNwZWNOYW1lID0gZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmZpZWxkLm5hbWU7XG4gICAgICAgICAgICAgICAgKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGRFbnVtU3BlY05hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklFTERERUZfSElHSExJR0hURUQsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCwge1xuICAgICAgICAgICAgICBoaWdobGlnaHRlZEZpZWxkOiBmaWVsZERlZi5maWVsZFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzY29wZS5lbmFibGVQaWxsc1ByZXZpZXcpIHtcbiAgICAgICAgICAgICAgUGlsbHMucHJldmlldyhzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGRJbmZvTW91c2VvdXQgPSBmdW5jdGlvbihmaWVsZERlZiwgaW5kZXgpIHtcbiAgICAgICAgICBzY29wZS5ob3ZlcmVkID0gZmFsc2U7XG5cbiAgICAgICAgICBpZiAoaG92ZXJQcm9taXNlKSB7XG4gICAgICAgICAgICAvLyBpZiB3ZSB1bmhvdmVyIHdpdGhpblxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGhvdmVyUHJvbWlzZSA9IG51bGw7XG5cbiAgICAgICAgICBpZiAoKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdKSB7XG4gICAgICAgICAgICAvLyBkaXNhYmxlIHByZXZpZXcgaWYgaXQncyBlbmFibGVkXG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklFTERERUZfVU5ISUdITElHSFRFRCwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICAgIGhpZ2hsaWdodGVkRmllbGQ6IGZpZWxkRGVmLmZpZWxkXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFVubGluayBMaW5rIHRvIG9yaWdpbmFsIGZpZWxkIGluIHRoZSBDUUwtYmFzZWQgc3BlY1xuICAgICAgICAgICAgaWYgKHNjb3BlLmNoYXJ0LmVudW1TcGVjSW5kZXgpIHtcbiAgICAgICAgICAgICAgdmFyIGVudW1TcGVjSW5kZXggPSBzY29wZS5jaGFydC5lbnVtU3BlY0luZGV4O1xuICAgICAgICAgICAgICBpZiAoZW51bVNwZWNJbmRleC5lbmNvZGluZ3MgJiYgZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdICYmIGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5maWVsZCkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZEVudW1TcGVjTmFtZSA9IGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5maWVsZC5uYW1lO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSAoc2NvcGUuaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZEVudW1TcGVjTmFtZV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNjb3BlLmVuYWJsZVBpbGxzUHJldmlldykge1xuICAgICAgICAgICAgICBQaWxscy5wcmV2aWV3KG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5pc0VudW1lcmF0ZWRGaWVsZCA9IGZ1bmN0aW9uKGNoYXJ0LCBpbmRleCkge1xuICAgICAgICAgIGlmIChjaGFydC5lbnVtU3BlY0luZGV4KSB7XG4gICAgICAgICAgICBpZiAoY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3MgJiYgY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5pc0VudW1lcmF0ZWRDaGFubmVsID0gZnVuY3Rpb24oY2hhcnQsIGluZGV4KSB7XG4gICAgICAgICAgaWYgKGNoYXJ0LmVudW1TcGVjSW5kZXgpIHtcbiAgICAgICAgICAgIGlmIChjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5ncyAmJiBjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5jaGFubmVsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUucmVtb3ZlQm9va21hcmsgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgIEJvb2ttYXJrcy5yZW1vdmUoY2hhcnQpO1xuICAgICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUua2VlcEJvb2ttYXJrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUuc2hvd0Jvb2ttYXJrQWxlcnQgPSBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZlciByZW5kZXJpbmcgdGhlIGRlYnVnIERyb3AgcG9wdXAgdW50aWwgaXQgaXMgcmVxdWVzdGVkXG4gICAgICAgIHNjb3BlLnJlbmRlclBvcHVwID0gZmFsc2U7XG4gICAgICAgIC8vIFVzZSBfLm9uY2UgYmVjYXVzZSB0aGUgcG9wdXAgb25seSBuZWVkcyB0byBiZSBpbml0aWFsaXplZCBvbmNlXG4gICAgICAgIHNjb3BlLmluaXRpYWxpemVQb3B1cCA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IHRydWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLmxvZ0NvZGUgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKG5hbWUrJzpcXG5cXG4nLCBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBMT0dcblxuICAgICAgICBzY29wZS5sb2cgPSB7fTtcbiAgICAgICAgc2NvcGUubG9nLnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzcGVjKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgIHZhciBlbmNvZGluZyA9IHNwZWMuZW5jb2RpbmcsXG4gICAgICAgICAgICBmaWVsZERlZiA9IGVuY29kaW5nW2NoYW5uZWxdO1xuXG4gICAgICAgICAgcmV0dXJuIGZpZWxkRGVmICYmIGZpZWxkRGVmLnR5cGUgPT09IHZsLnR5cGUuUVVBTlRJVEFUSVZFICYmICFmaWVsZERlZi5iaW47XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUubG9nLnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMsIGNoYW5uZWwpIHtcbiAgICAgICAgICBpZiAoIXNjb3BlLmxvZy5zdXBwb3J0KHNwZWMsIGNoYW5uZWwpKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgdmFyIGZpZWxkRGVmID0gc3BlYy5lbmNvZGluZ1tjaGFubmVsXSxcbiAgICAgICAgICAgIHNjYWxlID0gZmllbGREZWYuc2NhbGUgPSBmaWVsZERlZi5zY2FsZSB8fCB7fTtcblxuICAgICAgICAgIGlmIChzY29wZS50b2dnbGVTaGVsZikge1xuICAgICAgICAgICAgUGlsbHMucmVzY2FsZShjaGFubmVsLCBzY2FsZS50eXBlID09PSAnbG9nJyA/ICdsaW5lYXInIDogJ2xvZycpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY2FsZS50eXBlID0gc2NhbGUudHlwZSA9PT0gJ2xvZycgPyAnbGluZWFyJyA6ICdsb2cnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5MT0dfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy5hY3RpdmUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbF0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkRGVmLnNjYWxlO1xuXG4gICAgICAgICAgcmV0dXJuIHNjYWxlICYmIHNjYWxlLnR5cGUgPT09ICdsb2cnO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBGSUxURVJcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCB0b2dnbGVGaWx0ZXJOdWxsIHRvIGJlIGl0cyBvd24gY2xhc3NcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXJOdWxsID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5OVUxMX0ZJTFRFUl9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG5cbiAgICAgICAgICBzcGVjLnRyYW5zZm9ybSA9IHNwZWMudHJhbnNmb3JtIHx8IHt9O1xuICAgICAgICAgIHNwZWMudHJhbnNmb3JtLmZpbHRlckludmFsaWQgPSBzcGVjLnRyYW5zZm9ybS5maWx0ZXJJbnZhbGlkID09PSB0cnVlID8gdW5kZWZpbmVkIDogdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGZpZWxkRGVmcyA9IHZsLnNwZWMuZmllbGREZWZzKHNwZWMpO1xuICAgICAgICAgIGZvciAodmFyIGkgaW4gZmllbGREZWZzKSB7XG4gICAgICAgICAgICB2YXIgZmllbGREZWYgPSBmaWVsZERlZnNbaV07XG4gICAgICAgICAgICBpZiAoXy5pbmNsdWRlcyhbdmwudHlwZS5PUkRJTkFMLCB2bC50eXBlLk5PTUlOQUxdLCBmaWVsZERlZi50eXBlKSAmJiBEYXRhc2V0LnNjaGVtYS5zdGF0cyhmaWVsZERlZikubWlzc2luZyA+IDApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgU09SVFxuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IHRvZ2dsZVNvcnQgdG8gYmUgaXRzIG93biBjbGFzc1xuXG4gICAgICAgIHZhciB0b2dnbGVTb3J0ID0gc2NvcGUudG9nZ2xlU29ydCA9IHt9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQubW9kZXMgPSBbJ29yZGluYWwtYXNjZW5kaW5nJywgJ29yZGluYWwtZGVzY2VuZGluZycsXG4gICAgICAgICAgJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnLCAncXVhbnRpdGF0aXZlLWRlc2NlbmRpbmcnLCAnY3VzdG9tJ107XG5cbiAgICAgICAgdG9nZ2xlU29ydC50b2dnbGUgPSBmdW5jdGlvbihzcGVjKSB7XG5cbiAgICAgICAgICB2YXIgY3VycmVudE1vZGUgPSB0b2dnbGVTb3J0Lm1vZGUoc3BlYyk7XG4gICAgICAgICAgdmFyIGN1cnJlbnRNb2RlSW5kZXggPSB0b2dnbGVTb3J0Lm1vZGVzLmluZGV4T2YoY3VycmVudE1vZGUpO1xuXG4gICAgICAgICAgdmFyIG5ld01vZGVJbmRleCA9IChjdXJyZW50TW9kZUluZGV4ICsgMSkgJSAodG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxKTtcbiAgICAgICAgICB2YXIgbmV3TW9kZSA9IHRvZ2dsZVNvcnQubW9kZXNbbmV3TW9kZUluZGV4XTtcblxuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TT1JUX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICBjdXJyZW50TW9kZTogY3VycmVudE1vZGUsXG4gICAgICAgICAgICBuZXdNb2RlOiBuZXdNb2RlXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuXG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy5zZXRTb3J0KGNoYW5uZWxzLm9yZGluYWwsIHRvZ2dsZVNvcnQuZ2V0U29ydChuZXdNb2RlLCBzcGVjKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydCA9IHRvZ2dsZVNvcnQuZ2V0U29ydChuZXdNb2RlLCBzcGVjKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqIEdldCBzb3J0IHByb3BlcnR5IGRlZmluaXRpb24gdGhhdCBtYXRjaGVzIGVhY2ggbW9kZS4gKi9cbiAgICAgICAgdG9nZ2xlU29ydC5nZXRTb3J0ID0gZnVuY3Rpb24obW9kZSwgc3BlYykge1xuICAgICAgICAgIGlmIChtb2RlID09PSAnb3JkaW5hbC1hc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdvcmRpbmFsLWRlc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Rlc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG4gICAgICAgICAgdmFyIHFFbmNEZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxzLnF1YW50aXRhdGl2ZV07XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBvcDogcUVuY0RlZi5hZ2dyZWdhdGUsXG4gICAgICAgICAgICAgIGZpZWxkOiBxRW5jRGVmLmZpZWxkLFxuICAgICAgICAgICAgICBvcmRlcjogJ2FzY2VuZGluZydcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wOiBxRW5jRGVmLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgZmllbGQ6IHFFbmNEZWYuZmllbGQsXG4gICAgICAgICAgICAgIG9yZGVyOiAnZGVzY2VuZGluZydcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgdG9nZ2xlU29ydC5tb2RlID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG4gICAgICAgICAgdmFyIHNvcnQgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxzLm9yZGluYWxdLnNvcnQ7XG5cbiAgICAgICAgICBpZiAoc29ydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ29yZGluYWwtYXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvZ2dsZVNvcnQubW9kZXMubGVuZ3RoIC0gMSA7IGkrKykge1xuICAgICAgICAgICAgLy8gY2hlY2sgaWYgc29ydCBtYXRjaGVzIGFueSBvZiB0aGUgc29ydCBmb3IgZWFjaCBtb2RlIGV4Y2VwdCAnY3VzdG9tJy5cbiAgICAgICAgICAgIHZhciBtb2RlID0gdG9nZ2xlU29ydC5tb2Rlc1tpXTtcbiAgICAgICAgICAgIHZhciBzb3J0T2ZNb2RlID0gdG9nZ2xlU29ydC5nZXRTb3J0KG1vZGUsIHNwZWMpO1xuXG4gICAgICAgICAgICBpZiAoXy5pc0VxdWFsKHNvcnQsIHNvcnRPZk1vZGUpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBtb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh2Zy51dGlsLmlzT2JqZWN0KHNvcnQpICYmIHNvcnQub3AgJiYgc29ydC5maWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuICdjdXN0b20nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdpbnZhbGlkIG1vZGUnKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0LmNoYW5uZWxzID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIHJldHVybiBzcGVjLmVuY29kaW5nLngudHlwZSA9PT0gdmwudHlwZS5OT01JTkFMIHx8IHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk9SRElOQUwgP1xuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd4JywgcXVhbnRpdGF0aXZlOiAneSd9IDpcbiAgICAgICAgICAgICAgICAgIHtvcmRpbmFsOiAneScsIHF1YW50aXRhdGl2ZTogJ3gnfTtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0LnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGVuY29kaW5nID0gc3BlYy5lbmNvZGluZztcblxuICAgICAgICAgIGlmICh2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdyb3cnKSB8fCB2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdjb2x1bW4nKSB8fFxuICAgICAgICAgICAgIXZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3gnKSB8fCAhdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAneScpIHx8XG4gICAgICAgICAgICAhdmwuZW5jb2RpbmcuaXNBZ2dyZWdhdGUoc3BlYy5lbmNvZGluZykpIHsgLy8gRklYTUUgcmVwbGFjZSB0aGlzIHByb3BlciBhbHdheXNOb09jY2x1c2lvbiBtZXRob2RcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAoZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk9SRElOQUwpICYmXG4gICAgICAgICAgICAgIHZsLmZpZWxkRGVmLmlzTWVhc3VyZShlbmNvZGluZy55KVxuICAgICAgICAgICAgKSA/ICd4JyA6XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgIChlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCB8fCBlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCkgJiZcbiAgICAgICAgICAgICAgdmwuZmllbGREZWYuaXNNZWFzdXJlKGVuY29kaW5nLngpXG4gICAgICAgICAgICApID8gJ3knIDogZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudG9nZ2xlU29ydENsYXNzID0gZnVuY3Rpb24odmxTcGVjKSB7XG4gICAgICAgICAgaWYgKCF2bFNwZWMgfHwgIXRvZ2dsZVNvcnQuc3VwcG9ydCh2bFNwZWMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2ludmlzaWJsZSc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIG9yZGluYWxDaGFubmVsID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQuY2hhbm5lbHModmxTcGVjKS5vcmRpbmFsLFxuICAgICAgICAgICAgbW9kZSA9IHZsU3BlYyAmJiB0b2dnbGVTb3J0Lm1vZGUodmxTcGVjKTtcblxuICAgICAgICAgIHZhciBkaXJlY3Rpb25DbGFzcyA9IG9yZGluYWxDaGFubmVsID09PSAneCcgPyAnc29ydC14ICcgOiAnJztcblxuICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1hc2MnO1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYWxwaGEtZGVzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWFzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFtb3VudC1kZXNjJztcbiAgICAgICAgICAgIGRlZmF1bHQ6IC8vIGN1c3RvbVxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydCc7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5UUkFOU1BPU0VfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICAgIGlmIChzY29wZS50b2dnbGVTaGVsZikge1xuICAgICAgICAgICAgUGlsbHMudHJhbnNwb3NlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENoYXJ0LnRyYW5zcG9zZShzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUuY2hhcnQgPSBudWxsO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZGlyZWN0aXZlOnZpc0xpc3RJdGVtXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdmlzTGlzdEl0ZW1cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd2bFBsb3RHcm91cFBvcHVwJywgZnVuY3Rpb24gKERyb3ApIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwcG9wdXAuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJ15edmxQbG90R3JvdXAnLFxuICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCB2bFBsb3RHcm91cENvbnRyb2xsZXIpIHtcbiAgICAgICAgdmFyIGRlYnVnUG9wdXAgPSBuZXcgRHJvcCh7XG4gICAgICAgICAgY29udGVudDogZWxlbWVudC5maW5kKCcuZGV2LXRvb2wnKVswXSxcbiAgICAgICAgICB0YXJnZXQ6IHZsUGxvdEdyb3VwQ29udHJvbGxlci5nZXREcm9wVGFyZ2V0KCksXG4gICAgICAgICAgcG9zaXRpb246ICdib3R0b20gcmlnaHQnLFxuICAgICAgICAgIG9wZW5PbjogJ2NsaWNrJyxcbiAgICAgICAgICBjb25zdHJhaW5Ub1dpbmRvdzogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZGVidWdQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwTGlzdCcsIGZ1bmN0aW9uICh2bCwgY3FsLCBqUXVlcnksIGNvbnN0cywgXywgTG9nZ2VyLCBQaWxscywgQ2hhcnQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3ZscGxvdGdyb3VwbGlzdC92bHBsb3Rncm91cGxpc3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIC8qKiBBbiBpbnN0YW5jZSBvZiBzcGVjUXVlcnlNb2RlbEdyb3VwICovXG4gICAgICAgIGVuYWJsZVBpbGxzUHJldmlldzogJz0nLFxuICAgICAgICBpbml0aWFsTGltaXQ6ICc9JyxcbiAgICAgICAgbGlzdFRpdGxlOiAnPScsXG4gICAgICAgIGl0ZW1zOiAnPScsXG4gICAgICAgIHByaW9yaXR5OiAnPScsXG4gICAgICAgIHNob3dNb3JlOiAnPScsXG4gICAgICAgIHBvc3RTZWxlY3RBY3Rpb246ICcmJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlIC8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgICAgc2NvcGUubGltaXQgPSBzY29wZS5pbml0aWFsTGltaXQgfHwgMztcblxuICAgICAgICAvLyBGdW5jdGlvbnNcbiAgICAgICAgc2NvcGUuZ2V0Q2hhcnQgPSBDaGFydC5nZXRDaGFydDtcbiAgICAgICAgc2NvcGUuaW5jcmVhc2VMaW1pdCA9IGluY3JlYXNlTGltaXQ7XG4gICAgICAgIHNjb3BlLmlzSW5saXN0ID0gaXNJbkxpc3Q7XG4gICAgICAgIHNjb3BlLnNlbGVjdCA9IHNlbGVjdDtcbiAgICAgICAgc2NvcGUuUGlsbHMgPSBQaWxscztcblxuICAgICAgICAvLyBlbGVtZW50LmJpbmQoJ3Njcm9sbCcsIGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vICAgIGlmKGpRdWVyeSh0aGlzKS5zY3JvbGxUb3AoKSArIGpRdWVyeSh0aGlzKS5pbm5lckhlaWdodCgpID49IGpRdWVyeSh0aGlzKVswXS5zY3JvbGxIZWlnaHQpe1xuICAgICAgICAvLyAgICAgaWYgKHNjb3BlLmxpbWl0IDwgc2NvcGUubW9kZWxHcm91cC5pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgLy8gICAgICAgc2NvcGUuaW5jcmVhc2VMaW1pdCgpO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICB9XG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGluY3JlYXNlTGltaXQoKSB7XG4gICAgICAgICAgc2NvcGUubGltaXQgKz0gNTtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTE9BRF9NT1JFLCBzY29wZS5saW1pdCwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKiogcmV0dXJuIGlmIHRoZSBwbG90IGlzIHN0aWxsIGluIHRoZSB2aWV3LCBzbyBpdCBtaWdodCBiZSBvbWl0dGVkIGZyb20gdGhlIHJlbmRlciBxdWV1ZSBpZiBuZWNlc3NhcnkuICovXG4gICAgICAgIGZ1bmN0aW9uIGlzSW5MaXN0KGNoYXJ0KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzY29wZS5pdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYoY2hhcnQuc3BlY00gPT09IHNjb3BlLml0ZW1zW2ldLmdldFRvcFNwZWNRdWVyeU1vZGVsKCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNlbGVjdChjaGFydCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TUEVDX1NFTEVDVCwgY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBQaWxscy5wYXJzZShjaGFydC52bFNwZWMpO1xuICAgICAgICAgIGlmIChzY29wZS5wb3N0U2VsZWN0QWN0aW9uKSB7XG4gICAgICAgICAgICBzY29wZS5wb3N0U2VsZWN0QWN0aW9uKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignY29tcGFjdEpTT04nLCBmdW5jdGlvbihKU09OMykge1xuICAgIHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgcmV0dXJuIEpTT04zLnN0cmluZ2lmeShpbnB1dCwgbnVsbCwgJyAgJywgODApO1xuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6ZW5jb2RlVXJpXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBlbmNvZGVVcmlcbiAqIEZpbHRlciBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2VuY29kZVVSSScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gd2luZG93LmVuY29kZVVSSShpbnB1dCk7XG4gICAgfTtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIGZhY2V0ZWR2aXouZmlsdGVyOnJlcG9ydFVybFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcmVwb3J0VXJsXG4gKiBGaWx0ZXIgaW4gdGhlIGZhY2V0ZWR2aXouXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigncmVwb3J0VXJsJywgZnVuY3Rpb24gKGNvbXBhY3RKU09ORmlsdGVyLCBfLCBjb25zdHMpIHtcbiAgICBmdW5jdGlvbiB2b3lhZ2VyUmVwb3J0KHBhcmFtcykge1xuICAgICAgdmFyIHVybCA9ICdodHRwczovL2RvY3MuZ29vZ2xlLmNvbS9mb3Jtcy9kLzFUOVpBMTRGM21tenJIUjdKSlZVS3lQWHpyTXFGNTRDakxJT2p2MkU3WkVNL3ZpZXdmb3JtPyc7XG5cbiAgICAgIGlmIChwYXJhbXMuZmllbGRzKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihfLnZhbHVlcyhwYXJhbXMuZmllbGRzKSkpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEyNDUxOTk0Nzc9JyArIHF1ZXJ5ICsgJyYnO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFyYW1zLnNwZWMpIHtcbiAgICAgICAgdmFyIHNwZWMgPSBfLm9taXQocGFyYW1zLnNwZWMsICdjb25maWcnKTtcbiAgICAgICAgc3BlYyA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuMTMyMzY4MDEzNj0nICsgc3BlYyArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5zcGVjMikge1xuICAgICAgICB2YXIgc3BlYzIgPSBfLm9taXQocGFyYW1zLnNwZWMyLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMyID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMyKSk7XG4gICAgICAgIHVybCArPSAnZW50cnkuODUzMTM3Nzg2PScgKyBzcGVjMiArICcmJztcbiAgICAgIH1cblxuICAgICAgdmFyIHR5cGVQcm9wID0gJ2VudHJ5LjE5NDAyOTI2Nzc9JztcbiAgICAgIHN3aXRjaCAocGFyYW1zLnR5cGUpIHtcbiAgICAgICAgY2FzZSAndmwnOlxuICAgICAgICAgIHVybCArPSB0eXBlUHJvcCArICdWaXN1YWxpemF0aW9uK1JlbmRlcmluZysoVmVnYWxpdGUpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3ZyJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrQWxnb3JpdGhtKyhWaXNyZWMpJic7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Z2JzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnUmVjb21tZW5kZXIrVUkrKEZhY2V0ZWRWaXopJic7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIH1cbiAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmx1aVJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xeEtzLXFHYUxaRVVmYlRtaGRtU29TMTNPS09FcHV1X05OV0U1VEFBbWxfWS92aWV3Zm9ybT8nO1xuICAgICAgaWYgKHBhcmFtcy5zcGVjKSB7XG4gICAgICAgIHZhciBzcGVjID0gXy5vbWl0KHBhcmFtcy5zcGVjLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYykpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEyNDUxOTk0Nzc9JyArIHNwZWMgKyAnJic7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIHJldHVybiBjb25zdHMuYXBwSWQgPT09ICd2b3lhZ2VyJyA/IHZveWFnZXJSZXBvcnQgOiB2bHVpUmVwb3J0O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGZpbHRlclxuICogQG5hbWUgdmVnYS1saXRlLXVpLmZpbHRlcjp1bmRlcnNjb3JlMnNwYWNlXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyB1bmRlcnNjb3JlMnNwYWNlXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCd1bmRlcnNjb3JlMnNwYWNlJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgIHJldHVybiBpbnB1dCA/IGlucHV0LnJlcGxhY2UoL18rL2csICcgJykgOiAnJztcbiAgICB9O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0FsZXJ0cycsIGZ1bmN0aW9uKCR0aW1lb3V0LCBfKSB7XG4gICAgdmFyIEFsZXJ0cyA9IHt9O1xuXG4gICAgQWxlcnRzLmFsZXJ0cyA9IFtdO1xuXG4gICAgQWxlcnRzLmFkZCA9IGZ1bmN0aW9uKG1zZywgZGlzbWlzcykge1xuICAgICAgdmFyIG1lc3NhZ2UgPSB7bXNnOiBtc2d9O1xuICAgICAgQWxlcnRzLmFsZXJ0cy5wdXNoKG1lc3NhZ2UpO1xuICAgICAgaWYgKGRpc21pc3MpIHtcbiAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGluZGV4ID0gXy5maW5kSW5kZXgoQWxlcnRzLmFsZXJ0cywgbWVzc2FnZSk7XG4gICAgICAgICAgQWxlcnRzLmNsb3NlQWxlcnQoaW5kZXgpO1xuICAgICAgICB9LCBkaXNtaXNzKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgQWxlcnRzLmNsb3NlQWxlcnQgPSBmdW5jdGlvbihpbmRleCkge1xuICAgICAgQWxlcnRzLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG5cbiAgICByZXR1cm4gQWxlcnRzO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Cb29rbWFya3NcbiAqIEBkZXNjcmlwdGlvblxuICogIyBCb29rbWFya3NcbiAqIFNlcnZpY2UgaW4gdGhlIHZsdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0Jvb2ttYXJrcycsIGZ1bmN0aW9uKF8sIHZsLCBsb2NhbFN0b3JhZ2VTZXJ2aWNlLCBMb2dnZXIsIERhdGFzZXQpIHtcbiAgICB2YXIgQm9va21hcmtzID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmxpc3QgPSBbXTtcbiAgICAgIHRoaXMuZGljdCA9IHt9O1xuICAgICAgdGhpcy5pc1N1cHBvcnRlZCA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuaXNTdXBwb3J0ZWQ7XG4gICAgfTtcblxuICAgIHZhciBwcm90byA9IEJvb2ttYXJrcy5wcm90b3R5cGU7XG5cbiAgICBwcm90by5zYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICBsb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldCgnYm9va21hcmtMaXN0JywgdGhpcy5saXN0KTtcbiAgICB9O1xuXG4gICAgcHJvdG8uc2F2ZUFubm90YXRpb25zID0gZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbihib29rbWFyaykgeyByZXR1cm4gYm9va21hcmsuc2hvcnRoYW5kID09PSBzaG9ydGhhbmQ7IH0pXG4gICAgICAgIC5jaGFydC5hbm5vdGF0aW9uID0gdGhpcy5kaWN0W3Nob3J0aGFuZF0uYW5ub3RhdGlvbjtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH07XG5cbiAgICAvLyBleHBvcnQgYWxsIGJvb2ttYXJrcyBhbmQgYW5ub3RhdGlvbnNcbiAgICBwcm90by5leHBvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBkaWN0aW9uYXJ5ID0gdGhpcy5kaWN0O1xuXG4gICAgICAvLyBwcmVwYXJlIGV4cG9ydCBkYXRhXG4gICAgICB2YXIgZXhwb3J0U3BlY3MgPSBbXTtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uKGJvb2ttYXJrKSB7XG4gICAgICAgIHZhciBzcGVjID0gYm9va21hcmsuY2hhcnQudmxTcGVjO1xuICAgICAgICBzcGVjLmRlc2NyaXB0aW9uID0gZGljdGlvbmFyeVtib29rbWFyay5zaG9ydGhhbmRdLmFubm90YXRpb247XG4gICAgICAgIGV4cG9ydFNwZWNzLnB1c2goc3BlYyk7XG4gICAgICB9KTtcblxuICAgICAgLy8gd3JpdGUgZXhwb3J0IGRhdGEgaW4gYSBuZXcgdGFiXG4gICAgICB2YXIgZXhwb3J0V2luZG93ID0gd2luZG93Lm9wZW4oKTtcbiAgICAgIGV4cG9ydFdpbmRvdy5kb2N1bWVudC5vcGVuKCk7XG4gICAgICBleHBvcnRXaW5kb3cuZG9jdW1lbnQud3JpdGUoJzxodG1sPjxib2R5PjxwcmU+JyArIEpTT04uc3RyaW5naWZ5KGV4cG9ydFNwZWNzLCBudWxsLCAyKSArICc8L3ByZT48L2JvZHk+PC9odG1sPicpO1xuICAgICAgZXhwb3J0V2luZG93LmRvY3VtZW50LmNsb3NlKCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMubGlzdCA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KCdib29rbWFya0xpc3QnKSB8fCBbXTtcblxuICAgICAgLy8gcG9wdWxhdGUgdGhpcy5kaWN0XG4gICAgICB2YXIgZGljdGlvbmFyeSA9IHRoaXMuZGljdDtcbiAgICAgIF8uZm9yRWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uKGJvb2ttYXJrKSB7XG4gICAgICAgIGRpY3Rpb25hcnlbYm9va21hcmsuc2hvcnRoYW5kXSA9IF8uY2xvbmVEZWVwKGJvb2ttYXJrLmNoYXJ0KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBwcm90by5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5saXN0LnNwbGljZSgwLCB0aGlzLmxpc3QubGVuZ3RoKTtcbiAgICAgIHRoaXMuZGljdCA9IHt9O1xuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19DTEVBUik7XG4gICAgfTtcblxuICAgIHByb3RvLmFkZCA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICBjb25zb2xlLmxvZygnYWRkaW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBjaGFydC50aW1lQWRkZWQgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXG4gICAgICAvLyBGSVhNRTogdGhpcyBpcyBub3QgYWx3YXlzIGEgZ29vZCBpZGVhXG4gICAgICBjaGFydC5zY2hlbWEgPSBEYXRhc2V0LnNjaGVtYTtcblxuICAgICAgdGhpcy5kaWN0W2NoYXJ0LnNob3J0aGFuZF0gPSBfLmNsb25lRGVlcChjaGFydCk7XG5cbiAgICAgIHRoaXMubGlzdC5wdXNoKHtzaG9ydGhhbmQ6IHNob3J0aGFuZCwgY2hhcnQ6IF8uY2xvbmVEZWVwKGNoYXJ0KX0pO1xuXG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0FERCwgc2hvcnRoYW5kKTtcbiAgICB9O1xuXG4gICAgcHJvdG8ucmVtb3ZlID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgIHZhciBzaG9ydGhhbmQgPSBjaGFydC5zaG9ydGhhbmQ7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdyZW1vdmluZycsIGNoYXJ0LnZsU3BlYywgc2hvcnRoYW5kKTtcblxuICAgICAgLy8gcmVtb3ZlIGJvb2ttYXJrIGZyb20gdGhpcy5saXN0XG4gICAgICB2YXIgaW5kZXggPSB0aGlzLmxpc3QuZmluZEluZGV4KGZ1bmN0aW9uKGJvb2ttYXJrKSB7IHJldHVybiBib29rbWFyay5zaG9ydGhhbmQgPT09IHNob3J0aGFuZDsgfSk7XG4gICAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIGJvb2ttYXJrIGZyb20gdGhpcy5kaWN0XG4gICAgICBkZWxldGUgdGhpcy5kaWN0W2NoYXJ0LnNob3J0aGFuZF07XG5cbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfUkVNT1ZFLCBzaG9ydGhhbmQpO1xuICAgIH07XG5cbiAgICBwcm90by5yZW9yZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNhdmUoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uaXNCb29rbWFya2VkID0gZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICByZXR1cm4gdGhpcy5kaWN0Lmhhc093blByb3BlcnR5KHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMT1NFKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBCb29rbWFya3MoKTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0NoYXJ0JywgZnVuY3Rpb24gKGNxbCwgXykge1xuICAgIHZhciBDaGFydCA9IHtcbiAgICAgIGdldENoYXJ0OiBnZXRDaGFydCxcbiAgICAgIHRyYW5zcG9zZTogdHJhbnNwb3NlXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTcGVjUXVlcnlNb2RlbEdyb3VwIHwgU3BlY1F1ZXJ5TW9kZWx9IGl0ZW1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRDaGFydChpdGVtKSB7XG4gICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAvKiogQHR5cGUge09iamVjdH0gY29uY2lzZSBzcGVjIGdlbmVyYXRlZCAqL1xuICAgICAgICAgIHZsU3BlYzogbnVsbCxcbiAgICAgICAgICBmaWVsZFNldDogbnVsbCxcblxuICAgICAgICAgIC8qKiBAdHlwZSB7U3RyaW5nfSBnZW5lcmF0ZWQgdmwgc2hvcnRoYW5kICovXG4gICAgICAgICAgc2hvcnRoYW5kOiBudWxsLFxuICAgICAgICAgIGVudW1TcGVjSW5kZXg6IG51bGxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNwZWNNID0gaXRlbSBpbnN0YW5jZW9mIGNxbC5tb2RlbC5TcGVjUXVlcnlNb2RlbEdyb3VwID9cbiAgICAgICAgaXRlbS5nZXRUb3BTcGVjUXVlcnlNb2RlbCgpOlxuICAgICAgICBpdGVtO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZW51bVNwZWNJbmRleDogc3BlY00uZW51bVNwZWNJbmRleCxcbiAgICAgICAgZmllbGRTZXQ6IHNwZWNNLnNwZWNRdWVyeS5lbmNvZGluZ3MsXG4gICAgICAgIHZsU3BlYzogc3BlY00udG9TcGVjKCksXG4gICAgICAgIHNob3J0aGFuZDogc3BlY00udG9TaG9ydGhhbmQoKSxcbiAgICAgICAgc3BlY006IHNwZWNNXG4gICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYW5zcG9zZShzcGVjKSB7XG4gICAgICB2YXIgZW5jb2RpbmcgPSBfLmNsb25lKHNwZWMuZW5jb2RpbmcpO1xuICAgICAgdmFyIG9sZFhFbmMgPSBlbmNvZGluZy54O1xuICAgICAgdmFyIG9sZFlFbmMgPSBlbmNvZGluZy55O1xuICAgICAgZW5jb2RpbmcueSA9IG9sZFhFbmM7XG4gICAgICBlbmNvZGluZy54ID0gb2xkWUVuYztcblxuICAgICAgdmFyIG9sZFJvd0VuYyA9IGVuY29kaW5nLnJvdztcbiAgICAgIHZhciBvbGRDb2xFbmMgPSBlbmNvZGluZy5jb2x1bW47XG4gICAgICBlbmNvZGluZy5yb3cgPSBvbGRDb2xFbmM7XG4gICAgICBlbmNvZGluZy5jb2x1bW4gPSBvbGRSb3dFbmM7XG5cbiAgICAgIHNwZWMuZW5jb2RpbmcgPSBlbmNvZGluZztcbiAgICB9XG5cbiAgICByZXR1cm4gQ2hhcnQ7XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VydmljZSBmb3IgdGhlIHNwZWMgY29uZmlnLlxuLy8gV2Uga2VlcCB0aGlzIHNlcGFyYXRlIHNvIHRoYXQgY2hhbmdlcyBhcmUga2VwdCBldmVuIGlmIHRoZSBzcGVjIGNoYW5nZXMuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdDb25maWcnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgQ29uZmlnID0ge307XG5cbiAgICBDb25maWcuZGF0YSA9IHt9O1xuICAgIENvbmZpZy5jb25maWcgPSB7fTtcblxuICAgIENvbmZpZy5nZXRDb25maWcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmdldERhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBDb25maWcuZGF0YTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLmxhcmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgd2lkdGg6IDQwMCxcbiAgICAgICAgICBoZWlnaHQ6IDQwMFxuICAgICAgICB9LFxuICAgICAgICBmYWNldDoge1xuICAgICAgICAgIGNlbGw6IHtcbiAgICAgICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgICAgICBoZWlnaHQ6IDIwMFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnNtYWxsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBmYWNldDoge1xuICAgICAgICAgIGNlbGw6IHtcbiAgICAgICAgICAgIHdpZHRoOiAxNTAsXG4gICAgICAgICAgICBoZWlnaHQ6IDE1MFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0LCB0eXBlKSB7XG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudmFsdWVzID0gZGF0YXNldC52YWx1ZXM7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS51cmw7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBDb25maWcuZGF0YS51cmwgPSBkYXRhc2V0LnVybDtcbiAgICAgICAgZGVsZXRlIENvbmZpZy5kYXRhLnZhbHVlcztcbiAgICAgICAgQ29uZmlnLmRhdGEuZm9ybWF0VHlwZSA9IHR5cGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBDb25maWc7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkubG9nZ2VyXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbG9nZ2VyXG4gKiBTZXJ2aWNlIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0xvZ2dlcicsIGZ1bmN0aW9uICgkbG9jYXRpb24sICR3aW5kb3csICR3ZWJTcWwsIF8sIGNvbnN0cywgQW5hbHl0aWNzLCBQYXBhLCBCbG9iLCBVUkwpIHtcblxuICAgIHZhciBzZXJ2aWNlID0ge307XG5cbiAgICBzZXJ2aWNlLmxldmVscyA9IHtcbiAgICAgIE9GRjoge2lkOidPRkYnLCByYW5rOjB9LFxuICAgICAgVFJBQ0U6IHtpZDonVFJBQ0UnLCByYW5rOjF9LFxuICAgICAgREVCVUc6IHtpZDonREVCVUcnLCByYW5rOjJ9LFxuICAgICAgSU5GTzoge2lkOidJTkZPJywgcmFuazozfSxcbiAgICAgIFdBUk46IHtpZDonV0FSTicsIHJhbms6NH0sXG4gICAgICBFUlJPUjoge2lkOidFUlJPUicsIHJhbms6NX0sXG4gICAgICBGQVRBTDoge2lkOidGQVRBTCcsIHJhbms6Nn1cbiAgICB9O1xuXG4gICAgc2VydmljZS5hY3Rpb25zID0ge1xuICAgICAgLy8gREFUQVxuICAgICAgSU5JVElBTElaRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnSU5JVElBTElaRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBVTkRPOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdVTkRPJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgUkVETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnUkVETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfT1BFTjoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9ORVdfUEFTVEU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfTkVXX1BBU1RFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9ORVdfVVJMOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19VUkwnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICAvLyBCT09LTUFSS1xuICAgICAgQk9PS01BUktfQUREOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19BREQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19SRU1PVkU6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX1JFTU9WRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX09QRU46IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX09QRU4nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19DTE9TRToge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQ0xPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19DTEVBUjoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDogJ0JPT0tNQVJLX0NMRUFSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQ0hBUlRcbiAgICAgIENIQVJUX01PVVNFT1ZFUjoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVkVSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX01PVVNFT1VUOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9NT1VTRU9VVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9SRU5ERVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX1JFTkRFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9FWFBPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX0VYUE9TRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9UT09MVElQJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfSxcbiAgICAgIENIQVJUX1RPT0xUSVBfRU5EOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9UT09MVElQX0VORCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG5cbiAgICAgIFNPUlRfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidTT1JUX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE1BUktfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidNQVJLX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fT1BFTjoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonRFJJTExfRE9XTl9PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRFJJTExfRE9XTl9DTE9TRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0RSSUxMX0RPV05fQ0xPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0dfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnTE9HX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFRSQU5TUE9TRV9UT0dHTEU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdUUkFOU1BPU0VfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTlVMTF9GSUxURVJfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidOVUxMX0ZJTFRFUl9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIENMVVNURVJfU0VMRUNUOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDTFVTVEVSX1NFTEVDVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIExPQURfTU9SRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTE9BRF9NT1JFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBGSUVMRFNcbiAgICAgIEZJRUxEU19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEU19SRVNFVDoge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGSUVMRFNfUkVTRVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGVU5DX0NIQU5HRToge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGVU5DX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEFERF9GSUVMRDoge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdBRERfRklFTEQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIEZpZWxkIEluZm9cbiAgICAgIEZJRUxEREVGX0hJR0hMSUdIVEVEOiB7Y2F0ZWdvcnk6ICdGSUVMRElORk8nLCBpZDogJ0ZJRUxEREVGX0hJR0hMSUdIVEVEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRklFTERERUZfVU5ISUdITElHSFRFRDoge2NhdGVnb3J5OiAnRklFTERJTkZPJywgaWQ6ICdGSUVMRERFRl9VTkhJR0hMSUdIVEVEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvL1BPTEVTVEFSXG4gICAgICBTUEVDX0NMRUFOOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NMRUFOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgU1BFQ19DSEFOR0U6IHtjYXRlZ29yeTonUE9MRVNUQVInLCBpZDogJ1NQRUNfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRklFTERfRFJPUDoge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ0ZJRUxEX0RST1AnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX0NIQU5HRToge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ01BUktfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBWb3lhZ2VyIDJcbiAgICAgIFNQRUNfU0VMRUNUOiB7Y2F0ZWdvcnk6J1ZPWUFHRVIyJywgaWQ6ICdTUEVDX1NFTEVDVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gQWx0ZXJuYXRpdmVzXG4gICAgICBTRVRfQUxURVJOQVRJVkVTX1RZUEU6IHtjYXRlZ29yeTonQUxURVJOQVRJVkVTJywgaWQ6ICdTRVRfQUxURVJOQVRJVkVTX1RZUEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUT0dHTEVfU0hPV19BTFRFUk5BVElWRVM6IHtjYXRlZ29yeTonQUxURVJOQVRJVkVTJywgaWQ6ICdUT0dHTEVfU0hPV19BTFRFUk5BVElWRVMnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUT0dHTEVfSElERV9BTFRFUk5BVElWRVM6IHtjYXRlZ29yeTonQUxURVJOQVRJVkVTJywgaWQ6ICdUT0dHTEVfSElERV9BTFRFUk5BVElWRVMnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIFByZXZpZXdcbiAgICAgIFNQRUNfUFJFVklFV19FTkFCTEVEOiB7Y2F0ZWdvcnk6J1BSRVZJRVcnLCBpZDogJ1NQRUNfUFJFVklFV19FTkFCTEVEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgU1BFQ19QUkVWSUVXX0RJU0FCTEVEOiB7Y2F0ZWdvcnk6J1BSRVZJRVcnLCBpZDogJ1NQRUNfUFJFVklFV19ESVNBQkxFRCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfVxuICAgIH07XG5cbiAgICAvLyBjcmVhdGUgbm9vcCBzZXJ2aWNlIGlmIHdlYnNxbCBpcyBub3Qgc3VwcG9ydGVkXG4gICAgaWYgKCR3aW5kb3cub3BlbkRhdGFiYXNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnNvbGUud2FybignTm8gd2Vic3FsIHN1cHBvcnQgYW5kIHRodXMgbm8gbG9nZ2luZy4nKTtcbiAgICAgIHNlcnZpY2UubG9nSW50ZXJhY3Rpb24gPSBmdW5jdGlvbigpIHt9O1xuICAgICAgcmV0dXJuIHNlcnZpY2U7XG4gICAgfVxuXG4gICAgLy8gZ2V0IHVzZXIgaWQgb25jZSBpbiB0aGUgYmVnaW5uaW5nXG4gICAgdmFyIHVzZXJpZCA9IHNlcnZpY2UudXNlcmlkID0gJGxvY2F0aW9uLnNlYXJjaCgpLnVzZXJpZDtcblxuICAgIHNlcnZpY2UuZGIgPSAkd2ViU3FsLm9wZW5EYXRhYmFzZSgnbG9ncycsICcxLjAnLCAnTG9ncycsIDIgKiAxMDI0ICogMTAyNCk7XG5cbiAgICBzZXJ2aWNlLnRhYmxlTmFtZSA9ICdMb2dzXycgKyBjb25zdHMuYXBwSWQ7XG5cbiAgICAvLyAoemVuaW5nKSBUT0RPOiBjaGVjayBpZiB0aGUgdGFibGUgaXMgY29ycmVjdCwgZG8gd2UgcmVhbGx5IG5lZWQgdGltZT8gd2lsbCB0aW1lIGJlIGF1dG9tYXRpY2FsbHkgYWRkZWQ/XG4gICAgc2VydmljZS5jcmVhdGVUYWJsZUlmTm90RXhpc3RzID0gZnVuY3Rpb24oKSB7XG4gICAgICBzZXJ2aWNlLmRiLmNyZWF0ZVRhYmxlKHNlcnZpY2UudGFibGVOYW1lLCB7XG4gICAgICAgICd1c2VyaWQnOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnSU5URUdFUicsXG4gICAgICAgICAgJ251bGwnOiAnTk9UIE5VTEwnXG4gICAgICAgIH0sXG4gICAgICAgICd0aW1lJzoge1xuICAgICAgICAgICd0eXBlJzogJ1RJTUVTVEFNUCcsXG4gICAgICAgICAgJ251bGwnOiAnTk9UIE5VTEwnXG4gICAgICAgIH0sXG4gICAgICAgICdhY3Rpb25DYXRlZ29yeSc6IHtcbiAgICAgICAgICAndHlwZSc6ICdURVhUJyxcbiAgICAgICAgICAnbnVsbCc6ICdOT1QgTlVMTCdcbiAgICAgICAgfSxcbiAgICAgICAgJ2FjdGlvbklkJzoge1xuICAgICAgICAgICd0eXBlJzogJ1RFWFQnLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAnbGFiZWwnOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnVEVYVCcsXG4gICAgICAgICAgJ251bGwnOiAnTk9UIE5VTEwnXG4gICAgICAgIH0sXG4gICAgICAgICdkYXRhJzoge1xuICAgICAgICAgICd0eXBlJzogJ1RFWFQnXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBzZXJ2aWNlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgciA9ICR3aW5kb3cuY29uZmlybSgnUmVhbGx5IGNsZWFyIHRoZSBsb2dzPycpO1xuICAgICAgaWYgKHIgPT09IHRydWUpIHtcbiAgICAgICAgc2VydmljZS5kYi5kcm9wVGFibGUoc2VydmljZS50YWJsZU5hbWUpO1xuICAgICAgICBzZXJ2aWNlLmNyZWF0ZVRhYmxlSWZOb3RFeGlzdHMoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgc2VydmljZS5leHBvcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHNlcnZpY2UuZGIuc2VsZWN0QWxsKHNlcnZpY2UudGFibGVOYW1lKS50aGVuKGZ1bmN0aW9uKHJlc3VsdHMpIHtcbiAgICAgICAgaWYgKHJlc3VsdHMucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ05vIGxvZ3MnKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcm93cyA9IFtdO1xuXG4gICAgICAgIGZvcih2YXIgaT0wOyBpIDwgcmVzdWx0cy5yb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgcm93cy5wdXNoKHJlc3VsdHMucm93cy5pdGVtKGkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjc3YgPSBQYXBhLnVucGFyc2Uocm93cyk7XG5cbiAgICAgICAgdmFyIGNzdkRhdGEgPSBuZXcgQmxvYihbY3N2XSwgeyB0eXBlOiAndGV4dC9jc3YnIH0pO1xuICAgICAgICB2YXIgY3N2VXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChjc3ZEYXRhKTtcblxuICAgICAgICB2YXIgZWxlbWVudCA9IGFuZ3VsYXIuZWxlbWVudCgnPGEvPicpO1xuICAgICAgICBlbGVtZW50LmF0dHIoe1xuICAgICAgICAgIGhyZWY6IGNzdlVybCxcbiAgICAgICAgICB0YXJnZXQ6ICdfYmxhbmsnLFxuICAgICAgICAgIGRvd25sb2FkOiBzZXJ2aWNlLnRhYmxlTmFtZSArICdfJyArIHVzZXJpZCArICdfJyArIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSArICcuY3N2J1xuICAgICAgICB9KVswXS5jbGljaygpO1xuICAgICAgfSk7XG4gICAgfTtcblxuXG4gICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbiwgbGFiZWwsIGRhdGEpIHtcbiAgICAgIGlmICghY29uc3RzLmxvZ2dpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIHZhbHVlID0gZGF0YSA/IGRhdGEudmFsdWUgOiB1bmRlZmluZWQ7XG4gICAgICBpZihhY3Rpb24ubGV2ZWwucmFuayA+PSBzZXJ2aWNlLmxldmVsc1tjb25zdHMubG9nTGV2ZWwgfHwgJ0lORk8nXS5yYW5rKSB7XG4gICAgICAgIEFuYWx5dGljcy50cmFja0V2ZW50KGFjdGlvbi5jYXRlZ29yeSwgYWN0aW9uLmlkLCBsYWJlbCwgdmFsdWUpO1xuXG4gICAgICAgIGlmIChjb25zdHMubG9nVG9XZWJTcWwpIHtcbiAgICAgICAgICB2YXIgcm93ID0ge1xuICAgICAgICAgICAgdXNlcmlkOiB1c2VyaWQsXG4gICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBhY3Rpb25DYXRlZ29yeTogYWN0aW9uLmNhdGVnb3J5LFxuICAgICAgICAgICAgYWN0aW9uSWQ6IGFjdGlvbi5pZCxcbiAgICAgICAgICAgIGxhYmVsOiBfLmlzT2JqZWN0KGxhYmVsKSA/IEpTT04uc3RyaW5naWZ5KGxhYmVsKSA6IGxhYmVsLFxuICAgICAgICAgICAgZGF0YTogZGF0YSA/IEpTT04uc3RyaW5naWZ5KGRhdGEpIDogdW5kZWZpbmVkXG4gICAgICAgICAgfTtcbiAgICAgICAgICBzZXJ2aWNlLmRiLmluc2VydChzZXJ2aWNlLnRhYmxlTmFtZSwgcm93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTG9nZ2luZ10gJywgYWN0aW9uLmlkLCBsYWJlbCwgZGF0YSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuY3JlYXRlVGFibGVJZk5vdEV4aXN0cygpO1xuICAgIGNvbnNvbGUubG9nKCdhcHA6JywgY29uc3RzLmFwcElkLCAnc3RhcnRlZCcpO1xuICAgIHNlcnZpY2UubG9nSW50ZXJhY3Rpb24oc2VydmljZS5hY3Rpb25zLklOSVRJQUxJWkUsIGNvbnN0cy5hcHBJZCk7XG5cbiAgICByZXR1cm4gc2VydmljZTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ1BpbGxzJywgZnVuY3Rpb24gKEFOWSwgdXRpbCkge1xuICAgIHZhciBQaWxscyA9IHtcbiAgICAgIC8vIEZ1bmN0aW9uc1xuICAgICAgaXNBbnlDaGFubmVsOiBpc0FueUNoYW5uZWwsXG4gICAgICBnZXROZXh0QW55Q2hhbm5lbElkOiBnZXROZXh0QW55Q2hhbm5lbElkLFxuICAgICAgZ2V0RW1wdHlBbnlDaGFubmVsSWQ6IGdldEVtcHR5QW55Q2hhbm5lbElkLFxuICAgICAgaXNFbnVtZXJhdGVkQ2hhbm5lbDogaXNFbnVtZXJhdGVkQ2hhbm5lbCxcbiAgICAgIGlzRW51bWVyYXRlZEZpZWxkOiBpc0VudW1lcmF0ZWRGaWVsZCxcblxuICAgICAgZ2V0OiBnZXQsXG4gICAgICAvLyBFdmVudFxuICAgICAgZHJhZ1N0YXJ0OiBkcmFnU3RhcnQsXG4gICAgICBkcmFnU3RvcDogZHJhZ1N0b3AsXG4gICAgICAvLyBFdmVudCwgd2l0aCBoYW5kbGVyIGluIHRoZSBsaXN0ZW5lclxuXG4gICAgICAvKiogU2V0IGEgZmllbGREZWYgZm9yIGEgY2hhbm5lbCAqL1xuICAgICAgc2V0OiBzZXQsXG5cbiAgICAgIC8qKiBSZW1vdmUgYSBmaWVsZERlZiBmcm9tIGEgY2hhbm5lbCAqL1xuICAgICAgcmVtb3ZlOiByZW1vdmUsXG5cbiAgICAgIC8qKiBBZGQgbmV3IGZpZWxkIHRvIHRoZSBwaWxscyAqL1xuICAgICAgYWRkOiBhZGQsXG5cbiAgICAgIC8qKiBQYXNzIG1lc3NhZ2UgdG8gdG9nZ2xlciBsaXN0ZW5lcnMgKi9cbiAgICAgIHJlc2NhbGU6IHJlc2NhbGUsXG4gICAgICBzb3J0OiBzb3J0LFxuICAgICAgdHJhbnNwb3NlOiB0cmFuc3Bvc2UsXG5cbiAgICAgIC8qKiBQYXJzZSBhIG5ldyBzcGVjICovXG4gICAgICBwYXJzZTogcGFyc2UsXG5cbiAgICAgIC8qKiBQcmV2aWV3IGEgc3BlYyAqL1xuICAgICAgcHJldmlldzogcHJldmlldyxcblxuICAgICAgLyoqIElmIHRoZSBzcGVjL3F1ZXJ5IGdldHMgdXBkYXRlZCAqL1xuICAgICAgdXBkYXRlOiB1cGRhdGUsXG5cbiAgICAgIHJlc2V0OiByZXNldCxcbiAgICAgIGRyYWdEcm9wOiBkcmFnRHJvcCxcblxuICAgICAgLy8gRGF0YVxuICAgICAgLy8gVE9ETzogc3BsaXQgYmV0d2VlbiBlbmNvZGluZyByZWxhdGVkIGFuZCBub24tZW5jb2RpbmcgcmVsYXRlZFxuICAgICAgcGlsbHM6IHt9LFxuICAgICAgaGlnaGxpZ2h0ZWQ6IHt9LFxuICAgICAgLyoqIHBpbGwgYmVpbmcgZHJhZ2dlZCAqL1xuICAgICAgZHJhZ2dpbmc6IG51bGwsXG4gICAgICAvKiogY2hhbm5lbElkIHRoYXQncyB0aGUgcGlsbCBpcyBiZWluZyBkcmFnZ2VkIGZyb20gKi9cbiAgICAgIGNpZERyYWdGcm9tOiBudWxsLFxuICAgICAgLyoqIExpc3RlbmVyICAqL1xuICAgICAgbGlzdGVuZXI6IG51bGxcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBjaGFubmVsIGlkIGlzIGFuIFwiYW55XCIgY2hhbm5lbFxuICAgICAqXG4gICAgICogQHBhcmFtIHthbnl9IGNoYW5uZWxJZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzQW55Q2hhbm5lbChjaGFubmVsSWQpIHtcbiAgICAgIHJldHVybiBjaGFubmVsSWQgJiYgY2hhbm5lbElkLmluZGV4T2YoQU5ZKSA9PT0gMDsgLy8gcHJlZml4IGJ5IEFOWVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEVtcHR5QW55Q2hhbm5lbElkKCkge1xuICAgICAgdmFyIGFueUNoYW5uZWxzID0gdXRpbC5rZXlzKFBpbGxzLnBpbGxzKS5maWx0ZXIoZnVuY3Rpb24oY2hhbm5lbElkKSB7XG4gICAgICAgIHJldHVybiBjaGFubmVsSWQuaW5kZXhPZihBTlkpID09PSAwO1xuICAgICAgfSk7XG4gICAgICBmb3IgKHZhciBpPTAgOyBpIDwgYW55Q2hhbm5lbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoYW5uZWxJZCA9IGFueUNoYW5uZWxzW2ldO1xuICAgICAgICBpZiAoIVBpbGxzLnBpbGxzW2NoYW5uZWxJZF0uZmllbGQpIHtcbiAgICAgICAgICByZXR1cm4gY2hhbm5lbElkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGVtcHR5IGFueSBjaGFubmVsIGF2YWlsYWJsZSEnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROZXh0QW55Q2hhbm5lbElkKCkge1xuICAgICAgdmFyIGkgPSAwO1xuICAgICAgd2hpbGUgKFBpbGxzLnBpbGxzW0FOWSArIGldKSB7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICAgIHJldHVybiBBTlkgKyBpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCBhIGZpZWxkRGVmIG9mIGEgcGlsbCBvZiBhIGdpdmVuIGNoYW5uZWxJZFxuICAgICAqIEBwYXJhbSBjaGFubmVsSWQgY2hhbm5lbCBpZCBvZiB0aGUgcGlsbCB0byBiZSB1cGRhdGVkXG4gICAgICogQHBhcmFtIGZpZWxkRGVmIGZpZWxkRGVmIHRvIHRvIGJlIHVwZGF0ZWRcbiAgICAgKiBAcGFyYW0gdXBkYXRlIHdoZXRoZXIgdG8gcHJvcGFnYXRlIGNoYW5nZSB0byB0aGUgY2hhbm5lbCB1cGRhdGUgbGlzdGVuZXJcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXQoY2hhbm5lbElkLCBmaWVsZERlZiwgdXBkYXRlKSB7XG4gICAgICBQaWxscy5waWxsc1tjaGFubmVsSWRdID0gZmllbGREZWY7XG5cbiAgICAgIGlmICh1cGRhdGUgJiYgUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIuc2V0KGNoYW5uZWxJZCwgZmllbGREZWYpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhIGZpZWxkRGVmIG9mIGEgcGlsbCBvZiBhIGdpdmVuIGNoYW5uZWxJZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldChjaGFubmVsSWQpIHtcbiAgICAgIHJldHVybiBQaWxscy5waWxsc1tjaGFubmVsSWRdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZChmaWVsZERlZikge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLmFkZCkge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5hZGQoZmllbGREZWYpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRW51bWVyYXRlZENoYW5uZWwoY2hhbm5lbElkKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXIuaXNFbnVtZXJhdGVkQ2hhbm5lbCkge1xuICAgICAgICByZXR1cm4gUGlsbHMubGlzdGVuZXIuaXNFbnVtZXJhdGVkQ2hhbm5lbChjaGFubmVsSWQsIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRW51bWVyYXRlZEZpZWxkKGNoYW5uZWxJZCkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLmlzRW51bWVyYXRlZEZpZWxkKSB7XG4gICAgICAgIHJldHVybiBQaWxscy5saXN0ZW5lci5pc0VudW1lcmF0ZWRGaWVsZChjaGFubmVsSWQsIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZShjaGFubmVsSWQpIHtcbiAgICAgIGRlbGV0ZSBQaWxscy5waWxsc1tjaGFubmVsSWRdO1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnJlbW92ZShjaGFubmVsSWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNvcnQoY2hhbm5lbElkLCBzb3J0KSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXIuc29ydCkge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5zb3J0KGNoYW5uZWxJZCwgc29ydCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzY2FsZShjaGFubmVsSWQsIHNjYWxlVHlwZSkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLnJlc2NhbGUpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIucmVzY2FsZShjaGFubmVsSWQsIHNjYWxlVHlwZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhbnNwb3NlKCkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLnRyYW5zcG9zZSkge1xuICAgICAgICBQaWxscy5saXN0ZW5lci50cmFuc3Bvc2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZS1wYXJzZSB0aGUgc3BlYy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YW55fSBzcGVjXG4gICAgICovXG4gICAgZnVuY3Rpb24gcGFyc2Uoc3BlYykge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnBhcnNlKHNwZWMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBTcGVjIHRvIGJlIHByZXZpZXdlZCAoZm9yIFZveWFnZXIyKVxuICAgICAqXG4gICAgICogQHBhcmFtIHthbnl9IHNwZWNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwcmV2aWV3KHNwZWMpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lcikge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5wcmV2aWV3KHNwZWMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgd2hvbGUgcGlsbCBzZXRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YW55fSBzcGVjXG4gICAgICovXG4gICAgZnVuY3Rpb24gdXBkYXRlKHNwZWMpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lcikge1xuICAgICAgICBQaWxscy5saXN0ZW5lci51cGRhdGUoc3BlYyk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICAvKiogUmVzZXQgUGlsbHMgKi9cbiAgICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lcikge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5yZXNldCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7YW55fSBwaWxsIHBpbGwgYmVpbmcgZHJhZ2dlZFxuICAgICAqIEBwYXJhbSB7YW55fSBjaWREcmFnRnJvbSBjaGFubmVsIGlkIHRoYXQgdGhlIHBpbGwgaXMgZHJhZ2dlZCBmcm9tXG4gICAgICovXG4gICAgZnVuY3Rpb24gZHJhZ1N0YXJ0KHBpbGwsIGNpZERyYWdGcm9tKSB7XG4gICAgICBQaWxscy5kcmFnZ2luZyA9IHBpbGw7XG4gICAgICBQaWxscy5jaWREcmFnRnJvbSA9IGNpZERyYWdGcm9tO1xuICAgIH1cblxuICAgIC8qKiBTdG9wIHBpbGwgZHJhZ2dpbmcgKi9cbiAgICBmdW5jdGlvbiBkcmFnU3RvcCgpIHtcbiAgICAgIFBpbGxzLmRyYWdnaW5nID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXaGVuIGEgcGlsbCBpcyBkcm9wcGVkXG4gICAgICogQHBhcmFtIGNpZERyYWdUbyAgY2hhbm5lbElkIHRoYXQncyB0aGUgcGlsbCBpcyBiZWluZyBkcmFnZ2VkIHRvXG4gICAgICovXG4gICAgZnVuY3Rpb24gZHJhZ0Ryb3AoY2lkRHJhZ1RvKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIuZHJhZ0Ryb3AoY2lkRHJhZ1RvLCBQaWxscy5jaWREcmFnRnJvbSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFBpbGxzO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VydmljZSBmb3Igc2VydmluZyBWTCBTY2hlbWFcbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ1NjaGVtYScsIGZ1bmN0aW9uKHZnLCB2bCwgdmxTY2hlbWEpIHtcbiAgICB2YXIgU2NoZW1hID0ge307XG5cbiAgICBTY2hlbWEuc2NoZW1hID0gdmxTY2hlbWE7XG5cbiAgICBTY2hlbWEuZ2V0Q2hhbm5lbFNjaGVtYSA9IGZ1bmN0aW9uKGNoYW5uZWwpIHtcbiAgICAgIHZhciBkZWYgPSBudWxsO1xuICAgICAgdmFyIGVuY29kaW5nQ2hhbm5lbFByb3AgPSBTY2hlbWEuc2NoZW1hLmRlZmluaXRpb25zLkVuY29kaW5nLnByb3BlcnRpZXNbY2hhbm5lbF07XG4gICAgICAvLyBmb3IgZGV0YWlsLCBqdXN0IGdldCB0aGUgZmxhdCB2ZXJzaW9uXG4gICAgICB2YXIgcmVmID0gZW5jb2RpbmdDaGFubmVsUHJvcCA/XG4gICAgICAgIChlbmNvZGluZ0NoYW5uZWxQcm9wLiRyZWYgfHwgZW5jb2RpbmdDaGFubmVsUHJvcC5vbmVPZlswXS4kcmVmKSA6XG4gICAgICAgICdGaWVsZERlZic7IC8vIGp1c3QgdXNlIHRoZSBnZW5lcmljIHZlcnNpb24gZm9yIEFOWSBjaGFubmVsXG4gICAgICBkZWYgPSByZWYuc2xpY2UocmVmLmxhc3RJbmRleE9mKCcvJykrMSk7XG4gICAgICByZXR1cm4gU2NoZW1hLnNjaGVtYS5kZWZpbml0aW9uc1tkZWZdO1xuICAgIH07XG5cbiAgICByZXR1cm4gU2NoZW1hO1xuICB9KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
